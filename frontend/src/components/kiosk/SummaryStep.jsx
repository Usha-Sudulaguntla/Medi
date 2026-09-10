import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Volume2, Loader2, FileText, Leaf, Activity, Pill } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// SummaryStep — pre-submission review in the patient's selected language.
// "Listen to My Summary / सारांश सुनें" reads the full summary aloud (TTS)
// so non-literate patients can verify entries before submitting.
export default function SummaryStep({ lang, bcp47, chiefComplaint, track, socrates, ayush, documents, onBack, onContinue }) {
  const { speak, speaking, stopSpeak, setLang } = useVoice(lang);
  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const isAyush = track === "ayush_ayurveda";
  const trackLabel = isAyush ? t("ayushAyurveda", lang) : t("generalMedicine", lang);

  const spokenText = useMemo(() => {
    const parts = [];
    parts.push(`${t("chiefComplaintLabel", lang)}: ${chiefComplaint}`);
    parts.push(`${t("trackLabel", lang)}: ${trackLabel}`);
    if (!isAyush && socrates) {
      parts.push(t("socratesLabel", lang));
      if (socrates.onset) parts.push(`${t("onsetLabel", lang)} ${socrates.onset}`);
      if (socrates.character) parts.push(`${t("characterLabel", lang)} ${socrates.character}`);
      if (socrates.radiation) parts.push(`${t("radiationLabel", lang)} ${socrates.radiation}`);
      if (socrates.severity) parts.push(`${t("severityLabel", lang)} ${socrates.severity} out of 10`);
    }
    if (isAyush && ayush) {
      parts.push(t("ayushLabel", lang));
      Object.values(ayush).forEach((v) => { if (v?.label) parts.push(v.label); });
    }
    return parts.join(". ");
  }, [lang, chiefComplaint, track, socrates, ayush, isAyush, trackLabel]);

  const toggleListen = () => (speaking ? stopSpeak() : speak(spokenText));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F172A]">{t("summaryTitle", lang)}</h2>
          <p className="text-slate-500 mb-5">{t("summarySubtitle", lang)}</p>

          {/* Listen to summary (TTS) */}
          <button
            onClick={toggleListen}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 mb-5 min-h-[56px] hover:bg-[#0369A1] transition-colors"
          >
            {speaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
            {bi("listenSummary", lang)}
          </button>

          <div className="space-y-3">
            <Card icon={Activity} label={t("chiefComplaintLabel", lang)} accent="#0284C7">
              <p className="text-[#0F172A]">{chiefComplaint || "—"}</p>
            </Card>

            <Card icon={isAyush ? Leaf : FileText} label={t("trackLabel", lang)} accent={isAyush ? "#0D9488" : "#0284C7"}>
              <p className="font-medium text-[#0F172A]">{trackLabel}</p>
            </Card>

            {!isAyush && socrates && Object.keys(socrates).length > 0 && (
              <Card icon={Activity} label={t("socratesLabel", lang)} accent="#0284C7">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Meta k={t("onsetLabel", lang)} v={socrates.onset} />
                  <Meta k={t("characterLabel", lang)} v={socrates.character} />
                  <Meta k={t("radiationLabel", lang)} v={socrates.radiation} />
                  <Meta k={t("severityLabel", lang)} v={socrates.severity ? `${socrates.severity}/10` : ""} />
                </div>
              </Card>
            )}

            {isAyush && ayush && Object.keys(ayush).length > 0 && (
              <Card icon={Leaf} label={t("ayushLabel", lang)} accent="#0D9488">
                <div className="space-y-1.5 text-sm">
                  {Object.entries(ayush).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                      <span className="text-slate-500 shrink-0">{v?.dosha || k}</span>
                      <span className="font-medium text-[#0F172A] text-right">
                        {v?.label}{v?.detail ? ` — ${v.detail}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card icon={Pill} label={t("documentsLabel", lang)} accent="#0284C7">
              {documents && documents.length > 0 ? (
                <ul className="text-sm text-[#0F172A] list-disc pl-5">
                  {documents.map((d, i) => (
                    <li key={i}>{d.file_name || d.document_type || "Document"}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">{t("noDocuments", lang)}</p>
              )}
            </Card>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-600 min-h-[56px] hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" /> {t("editAnswers", lang)}
            </button>
            <button
              onClick={onContinue}
              className="flex items-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold px-8 py-4 min-h-[56px] hover:bg-[#0369A1]"
            >
              {t("confirmSubmit", lang)} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Card({ icon: Icon, label, accent, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" style={{ color: accent }} />
        <h3 className="font-bold text-[#0F172A]">{label}</h3>
      </div>
      {children}
    </div>
  );
}

function Meta({ k, v }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="font-medium text-[#0F172A] truncate">{v || "—"}</div>
    </div>
  );
}