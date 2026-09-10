import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { t, bi, bcp47For } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import { useNavigate } from "react-router-dom";

// IntakeSuccess — confirmation after submission. Session cache is purged.
export default function IntakeSuccess({ lang, uhid, sessionId }) {
  const navigate = useNavigate();
  const bcp47 = bcp47For(lang);
  const { speak, setLang } = useVoice(lang);
  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("intakeCompleteMsg", lang)); return () => window.speechSynthesis?.cancel(); }, []);
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="mx-auto mb-5 h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("visitRegistered", lang)}</h2>
        <p className="text-slate-500 mb-5">
          Your clinical history has been sent to the doctor. Please proceed to the consultation desk.
        </p>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5 text-left">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">UHID</span>
            <span className="font-semibold text-[#0F172A]">{uhid || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Session</span>
            <span className="font-mono text-xs text-slate-600">{sessionId?.slice(-8) || "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-5">
          <ShieldCheck className="h-4 w-4" /> Session cache purged for your privacy.
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 hover:bg-[#0369A1] min-h-[56px]"
        >
          Done <ArrowRight className="h-5 w-5" />
        </button>
      </motion.div>
    </div>
  );
}