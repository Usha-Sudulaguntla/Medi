import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Volume2 } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// ChiefComplaint — patient describes symptoms via voice or text.
// TTS reads the prompt aloud; the textarea pulses while speaking (karaoke highlight).
export default function ChiefComplaint({ lang, bcp47, value, onChange, onNext }) {
  const { speak, speaking, setLang } = useVoice(lang);
  const [text, setText] = useState(value || "");

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);

  useEffect(() => {
    // Audio guidance on mount.
    speak(bi("describeSymptoms", lang));
    return () => window.speechSynthesis?.cancel();
  }, []);

  const update = (v) => { setText(v); onChange(v); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-[#0F172A]">{bi("chiefSymptoms", lang)}</h2>
            <button
              onClick={() => speak(bi("describeSymptoms", lang))}
              className="ml-auto flex items-center gap-1 text-sm text-[#0284C7] font-medium"
            >
              <Volume2 className="h-4 w-4" /> Replay
            </button>
          </div>
          <p className="text-slate-500 mb-6">{bi("describeSymptoms", lang)}</p>

          <div
            className={`relative rounded-2xl border-2 bg-white p-4 transition-all ${
              speaking ? "border-[#0284C7] shadow-[0_0_0_4px_rgba(2,132,199,0.15)]" : "border-slate-200"
            }`}
          >
            <textarea
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-4 text-lg min-h-[160px] focus:outline-none focus:border-[#0284C7]"
              placeholder={t("describeSymptoms", lang)}
              value={text}
              onChange={(e) => update(e.target.value)}
            />
            <div className="flex justify-center mt-4">
              <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => update(text ? `${text} ${r}` : r)} />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onNext}
              disabled={!text.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold px-8 py-4 text-base hover:bg-[#0369A1] disabled:opacity-50 min-h-[56px]"
            >
              {t("next", lang)} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}