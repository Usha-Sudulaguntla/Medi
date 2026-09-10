import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, Lock } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useHoverVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// ConsentStep — audio-guided consent toggle, then submit + ephemeral session purge.
export default function ConsentStep({ lang, bcp47, onSubmit, submitting }) {
  const { speak, speakOption, activeKey, setLang } = useHoverVoice(lang);
  const [consented, setConsented] = useState(false);

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("consentBody", lang)); return () => window.speechSynthesis?.cancel(); }, []);

  const handleVoice = (r) => {
    const x = (r || "").toLowerCase();
    if (/(yes|consent|agree|हां|सहमत|అవును|ஆம்|হ্যাঁ|होय|હા|ಹೌದು)/.test(x)) setConsented(true);
    else if (/(no|नहीं|లేదు|இல்லை|না|नाही|ના|ಇಲ್ಲ)/.test(x)) setConsented(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-7"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-[#0D9488]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">{bi("consentTitle", lang)}</h2>
              <p className="text-xs text-slate-500">Data Privacy & Ephemeral Session</p>
            </div>
          </div>

          <p className="text-slate-600 mb-5">{bi("consentBody", lang)}</p>

          <button
            onClick={() => setConsented((c) => !c)}
            onMouseEnter={() => speakOption("consent", bi("iConsent", lang))}
            className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition-all min-h-[64px] ${
              consented ? "border-[#0D9488] bg-emerald-50"
              : activeKey === "consent" ? "border-[#0D9488] shadow-[0_0_0_4px_rgba(13,148,136,0.18)] bg-white"
              : "border-slate-200 bg-white"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                consented ? "bg-[#0D9488] text-white" : "bg-slate-200"
              }`}
            >
              {consented && <CheckCircle2 className="h-5 w-5" />}
            </span>
            <span className="font-semibold text-[#0F172A]">{bi("iConsent", lang)}</span>
          </button>

          <div className="flex justify-center mt-4">
            <VoiceMic lang={lang} bcp47={bcp47} onResult={handleVoice} />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" /> Session cache will be purged after submission.
          </div>

          <button
            onClick={onSubmit}
            disabled={!consented || submitting}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 text-base hover:bg-[#0369A1] disabled:opacity-50 min-h-[56px]"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Generating clinical summary…</>
            ) : (
              <>{t("submit", lang)} <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}