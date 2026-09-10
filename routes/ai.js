import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';

export const aiRouter = Router();

// Free tier, no card required — get a key at https://console.groq.com/keys
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';
// The only vision-capable model in Groq's free-tier catalog as of writing.
// Confirmed to support image input + JSON-mode structured output.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Free-tier keys can hit occasional 429 (rate limit) or 5xx under load —
// retry a few times with increasing delay before giving up.
const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES || 4);
const GROQ_RETRY_BASE_MS = Number(process.env.GROQ_RETRY_BASE_MS || 2000);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls Groq's OpenAI-compatible chat completions endpoint and parses the
// reply as JSON. `messages` follows standard OpenAI chat format; content can
// be a plain string (text-only) or an array of { type, text|image_url }
// parts (for vision requests).
async function callGroqJson({ messages, model }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in .env');

  let lastError;

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    let resp;
    try {
      resp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_completion_tokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS || 8192),
        }),
      });
    } catch (networkErr) {
      lastError = new Error(`Groq request failed: ${networkErr.message}`);
      if (attempt < GROQ_MAX_RETRIES) {
        await sleep(GROQ_RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    if (resp.ok) {
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq did not return any content');
      return JSON.parse(text);
    }

    const detail = await resp.text();
    lastError = new Error(`Groq API error (${resp.status}): ${detail}`);

    const canRetry = RETRYABLE_STATUS.has(resp.status) && attempt < GROQ_MAX_RETRIES;
    if (!canRetry) throw lastError;

    const delay = GROQ_RETRY_BASE_MS * 2 ** attempt + Math.random() * 300;
    console.warn(`Groq ${resp.status} on attempt ${attempt + 1}/${GROQ_MAX_RETRIES + 1}, retrying in ${Math.round(delay)}ms`);
    await sleep(delay);
  }

  throw lastError;
}

function overloadedStatus(error) {
  return /Groq API error \((429|500|502|503|504)/.test(error.message) ? 503 : 500;
}

// ---------------------------------------------------------------------------
// POST /api/ai/clinical-summary
// Replaces base44/functions/clinicalSummary — translates + structures the
// patient's kiosk intake into a standardized English clinical note and flags
// emergency red flags.
// ---------------------------------------------------------------------------
aiRouter.post('/clinical-summary', requireAuth, async (req, res) => {
  try {
    const {
      language, track, chiefComplaint, socrates, ayushAssessment,
      medicalHistory, allergies, currentMedications,
    } = req.body || {};

    if (!chiefComplaint) return res.status(400).json({ error: 'chiefComplaint is required' });

    const prompt = `You are a clinical summarizer for an Indian hospital OPD. Translate and structure the patient's intake into STANDARDIZED ENGLISH regardless of the input language (${language}). The doctor must receive a clean English EMR even if the patient spoke Hindi, Telugu, Tamil, Bengali, Marathi, Gujarati, Kannada, etc.

Patient track: ${track === 'ayush_ayurveda' ? 'AYUSH (Ayurveda)' : 'General Medicine (Allopathy)'}

Chief complaint (raw, may be in ${language}): "${chiefComplaint}"
SOCRATES: ${JSON.stringify(socrates || {})}
AYUSH assessment: ${JSON.stringify(ayushAssessment || {})}
Medical history (Yes/No flags + details): ${JSON.stringify(medicalHistory || {})}
Allergies: ${allergies || 'none'}
Current medications: ${currentMedications || 'none'}

Produce a structured English clinical note using these EXACT section headings:
1. Chief Complaint — one concise English line.
2. HPI (History of Present Illness) — SOCRATES detail in clinical English: onset, character, radiation, severity/10, timing, aggravating/relieving factors.
3. Relevant History — chronic conditions, past surgeries, drug allergies, current medications.
4. AYUSH Clinical Synthesis (ONLY if AYUSH track) — Agni type, Koshtha type, Ama presence, Prakriti indicators, one-line Vikriti impression.
5. Assessment — brief working impression.

Then determine EMERGENCY RED FLAGS (chest pain, stroke signs, severe breathing difficulty, unconsciousness, severe bleeding, anaphylaxis, suicidal ideation), and estimate PAIN/SYMPTOM SEVERITY 0-10 from the clinical language, independent of any slider value.

Respond ONLY with a JSON object matching exactly this shape, no extra commentary:
{
  "summary_en": string,
  "chief_complaint_en": string,
  "emergency_flag": boolean,
  "emergency_reason": string,
  "severity_score": integer (0-10),
  "severity_reasoning": string
}`;

    const result = await callGroqJson({
      model: GROQ_TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      summary_en: result.summary_en,
      chief_complaint_en: result.chief_complaint_en,
      emergency_flag: !!result.emergency_flag,
      emergency_reason: result.emergency_reason || '',
      severity_score: result.severity_score,
      severity_reasoning: result.severity_reasoning || '',
    });
  } catch (error) {
    console.error('CLINICAL SUMMARY ERROR:', error);
    const status = overloadedStatus(error);
    res.status(status).json({
      error: status === 503
        ? 'AI service is temporarily overloaded. Please try again in a moment.'
        : error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/scan-document  { file_url, document_type }
// Replaces base44/functions/scanDocument — reads a prescription/lab report/
// discharge summary and extracts structured data + flags abnormal lab values.
// ---------------------------------------------------------------------------
const MEDIA_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.webp': 'image/webp' };
// Groq's vision model accepts images only — no native PDF input. If a PDF
// comes in, fail fast with a clear message instead of a confusing 500.
const SUPPORTED_VISION_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function loadFileAsBase64(fileUrl) {
  const localMarker = '/uploads/';
  let buffer, ext;
  if (process.env.PUBLIC_BASE_URL && fileUrl.startsWith(process.env.PUBLIC_BASE_URL)) {
    // Local file served from this server's /uploads directory
    const filename = fileUrl.split(localMarker)[1];
    buffer = await fs.readFile(path.join('uploads', filename));
    ext = path.extname(filename).toLowerCase();
  } else {
    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Could not fetch file_url (${resp.status})`);
    buffer = Buffer.from(await resp.arrayBuffer());
    ext = path.extname(new URL(fileUrl).pathname).toLowerCase();
  }
  return { base64: buffer.toString('base64'), mediaType: MEDIA_TYPES[ext] || 'application/octet-stream' };
}

aiRouter.post('/scan-document', requireAuth, async (req, res) => {
  try {
    const { file_url, document_type } = req.body || {};
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const { base64, mediaType } = await loadFileAsBase64(file_url);

    if (!SUPPORTED_VISION_TYPES.has(mediaType)) {
      return res.status(400).json({
        error: 'This file type is not supported for scanning. Please upload a JPG, PNG, or WEBP photo of the document (PDF scanning is not currently supported).',
      });
    }

    const prompt = `Extract the full text and structured data from this medical document (expected type: ${document_type || 'unknown'}). Identify medications, lab test results (flagging any outside normal reference range as abnormal), and diagnoses.

Respond ONLY with a JSON object matching exactly this shape, no extra commentary:
{
  "document_type": string ("prescription" | "lab_report" | "discharge_summary" | "other"),
  "parsed_text": string (full extracted text content of the document),
  "medications": string[],
  "lab_values": [{ "test": string, "value": string, "unit": string, "reference_range": string, "abnormal": boolean }],
  "diagnosis": string[]
}`;

    const result = await callGroqJson({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        },
      ],
    });

    const abnormal_values = (result.lab_values || []).filter((lv) => lv.abnormal);

    res.json({
      document_type: result.document_type || document_type || 'other',
      parsed_text: result.parsed_text || '',
      medications: result.medications || [],
      lab_values: result.lab_values || [],
      abnormal_values,
      diagnosis: result.diagnosis || [],
    });
  } catch (error) {
    console.error('SCAN DOCUMENT ERROR:', error);
    const status = overloadedStatus(error);
    res.status(status).json({
      error: status === 503
        ? 'AI service is temporarily overloaded. Please try again in a moment.'
        : error.message,
    });
  }
});