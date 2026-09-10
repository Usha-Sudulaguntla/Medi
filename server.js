import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { entityRouter } from './routes/entities.js';
import { uploadRouter } from './routes/upload.js';
import { aiRouter } from './routes/ai.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);

app.use('/api/doctors', entityRouter('doctors', [
  'full_name', 'hospital', 'license_id', 'specialization', 'email', 'phone', 'user_id', 'active',
], {
  publicRead: true, // DoctorSignUp checks "is this email an active doctor?" before the visitor has a token
  writeRoles: ['admin'], // only ManageDoctors (admin) may add/edit/remove doctors
}));

app.use('/api/patients', entityRouter('patients', [
  'uhid', 'full_name', 'abha_id', 'email', 'phone', 'age', 'gender', 'preferred_language', 'track',
], {
  // auto-generate a UHID (MK-<year>-NNNNN) the way Base44's auto-id behavior did
  beforeCreate: async (body) => {
    if (body.uhid) return body;
    const year = new Date().getFullYear();
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM patients WHERE uhid LIKE $1`,
      [`MK-${year}-%`]
    );
    const next = String((rows[0]?.n || 0) + 1).padStart(5, '0');
    return { ...body, uhid: `MK-${year}-${next}` };
  },
}));

app.use('/api/intake-sessions', entityRouter('intake_sessions', [
  'patient_id', 'patient_name', 'uhid', 'abha_id', 'language', 'track',
  'chief_complaint', 'chief_complaint_en', 'socrates', 'ayush_assessment',
  'medical_history', 'allergies', 'current_medications', 'emergency_flag',
  'emergency_reason', 'summary_en', 'status', 'doctor_id', 'doctor_notes', 'confirmed_at',
  'severity_score', 'severity_reasoning',
]));

app.use('/api/medical-documents', entityRouter('medical_documents', [
  'patient_id', 'document_type', 'file_url', 'file_name', 'parsed_text', 'abnormal_values',
]));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`MediKiosk API listening on :${port}`));
