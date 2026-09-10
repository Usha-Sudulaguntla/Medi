import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Camera } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { base44 } from "@/api/base44Client";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// DocumentScan — camera/upload scanner for prescriptions, lab reports,
// discharge summaries. Parses & highlights abnormal lab values with red tags.
// For returning patients, previously saved documents are loaded (repeat-visitor memory).
export default function DocumentScan({ lang, bcp47, patientId, previousDocs = [], onBack, onNext }) {
  const { speak, setLang } = useVoice(lang);
  const fileRef = useRef(null);
  const [docs, setDocs] = useState(previousDocs);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("uploadPrescription", lang)); return () => window.speechSynthesis?.cancel(); }, []);

  const handleVoice = (r) => {
    const x = (r || "").toLowerCase();
    if (/(next|skip|continue|आगे|आगे बढ़|తదుపరి|அடுத்து|পরবর্তী|पुढे|આગળ|ಮುಂದೆ)/.test(x)) onNext(docs);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("scanDocument", { file_url, document_type: "other" });
      const data = res.data || res;
      const doc = {
        document_type: data.document_type,
        file_url,
        file_name: file.name,
        parsed_text: data.parsed_text,
        abnormal_values: data.abnormal_values || [],
        medications: data.medications || [],
      };
      // Persist to the patient's record for repeat-visitor memory.
      let saved = doc;
      if (patientId) {
        try {
          saved = await base44.entities.MedicalDocument.create({
            patient_id: patientId,
            document_type: doc.document_type,
            file_url: doc.file_url,
            file_name: doc.file_name,
            parsed_text: doc.parsed_text,
            abnormal_values: doc.abnormal_values,
          });
        } catch { /* keep unsaved copy */ }
      }
      setDocs((d) => [...d, saved]);
    } catch (e) {
      console.error("Document scan failed:", e);
      setError(`Could not scan document: ${e?.message || "you can continue without it."}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-1">{bi("scanDocument", lang)}</h2>
          <p className="text-slate-500 mb-6">{bi("uploadPrescription", lang)}</p>

          {previousDocs.length > 0 && (
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> Returning patient — {previousDocs.length} previous document(s) loaded from your record.
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0284C7] bg-white p-8 flex flex-col items-center gap-3 transition-colors min-h-[180px] disabled:opacity-60"
          >
            {uploading ? (
              <><Loader2 className="h-10 w-10 text-[#0284C7] animate-spin" /><span className="font-medium text-slate-600">Scanning document…</span></>
            ) : (
              <>
                <div className="flex gap-3">
                  <Camera className="h-10 w-10 text-[#0284C7]" />
                  <Upload className="h-10 w-10 text-[#0284C7]" />
                </div>
                <span className="font-semibold text-[#0F172A]">Tap to upload or capture</span>
                <span className="text-sm text-slate-500">Prescription · Lab report · Discharge summary</span>
              </>
            )}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          {/* Scanned documents list */}
          <div className="mt-6 space-y-3">
            <AnimatePresence>
              {docs.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-[#0284C7]" />
                    <span className="font-semibold text-[#0F172A] text-sm">{d.file_name || "Document"}</span>
                    <span className="ml-auto text-xs uppercase text-slate-400">{d.document_type}</span>
                  </div>
                  {d.parsed_text && (
                    <p className="text-sm text-slate-600 line-clamp-3 mb-2">{d.parsed_text.slice(0, 200)}…</p>
                  )}
                  {d.abnormal_values?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {d.abnormal_values.map((av, ai) => (
                        <span key={ai} className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> {av.test}: {av.value} {av.unit}
                        </span>
                      ))}
                    </div>
                  )}
                  {d.medications?.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">Medications: {d.medications.join(", ")}</div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex justify-center mb-4">
            <VoiceMic lang={lang} bcp47={bcp47} onResult={handleVoice} />
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={onBack} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-600 min-h-[56px]">
              <ArrowLeft className="h-5 w-5" /> {t("back", lang)}
            </button>
            <button
              onClick={() => onNext(docs)}
              className="flex items-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold px-8 py-4 min-h-[56px] hover:bg-[#0369A1]"
            >
              {t("next", lang)} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}