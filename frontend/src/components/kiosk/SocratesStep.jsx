import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Volume2 } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// SocratesStep — SOCRATES framework for General Medicine track.
// Onset, Character, Radiation, Severity (0-10 slider).
export default function SocratesStep({ lang, bcp47, data, onChange, onNext, onBack }) {
  const { speak, speaking, setLang } = useVoice(lang);
 const [s, setS] = useState(data || {
  site: "", onset: "", character: "", radiation: "",
  associated: "", timeCourse: "", exacerbating: "", severity: 3,
});

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("onset", lang)); return () => window.speechSynthesis?.cancel(); }, []);

  const set = (k, v) => { const next = { ...s, [k]: v }; setS(next); onChange(next); };

  const questions = [
    { key: "site", label: bi("site", lang), type: "text" },
    { key: "onset", label: bi("onset", lang), type: "text" },
    { key: "character", label: bi("character", lang), type: "text" },
    { key: "radiation", label: bi("radiation", lang), type: "text" },
    { key: "associated", label: bi("associated", lang), type: "text" },
    { key: "timeCourse", label: bi("timeCourse", lang), type: "text" },
    { key: "exacerbating", label: bi("exacerbating", lang), type: "text" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">SOCRATES Assessment</h2>
            <button onClick={() => speak(bi("onset", lang))} className="ml-auto flex items-center gap-1 text-sm text-[#0284C7] font-medium">
              <Volume2 className="h-4 w-4" /> Replay
            </button>
          </div>

          {questions.map((q, idx) => (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`mb-4 rounded-2xl border-2 bg-white p-4 transition-all ${
                speaking && idx === 0 ? "border-[#0284C7] shadow-[0_0_0_4px_rgba(2,132,199,0.15)]" : "border-slate-200"
              }`}
            >
              <label className="block text-lg font-semibold text-[#0F172A] mb-2">{q.label}</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-base focus:outline-none focus:border-[#0284C7] min-h-[56px]"
                value={s[q.key]}
                onChange={(e) => set(q.key, e.target.value)}
              />
              <div className="flex justify-center mt-3">
                <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => set(q.key, r)} />
              </div>
            </motion.div>
          ))}

          {/* Severity slider */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 rounded-2xl border-2 border-slate-200 bg-white p-5"
          >
            <label className="block text-lg font-semibold text-[#0F172A] mb-3">{bi("severity", lang)}</label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-emerald-600 font-medium">0</span>
              <input
                type="range" min={0} max={10} step={1}
                value={s.severity}
                onChange={(e) => set("severity", Number(e.target.value))}
                className="flex-1 accent-[#0284C7] h-3"
              />
              <span className="text-sm text-red-600 font-medium">10</span>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg"
                style={{ backgroundColor: s.severity >= 7 ? "#EF4444" : s.severity >= 4 ? "#EAB308" : "#22C55E" }}
              >
                {s.severity}
              </div>
            </div>
          </motion.div>

          <div className="flex justify-between mt-6">
            <button onClick={onBack} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-600 min-h-[56px]">
              <ArrowLeft className="h-5 w-5" /> {t("back", lang)}
            </button>
            <button
              onClick={onNext}
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