import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2, CheckCircle2, Send } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";

// EmergencyModal — asks the patient "What is the problem?" (text or voice)
// and sends the alert straight to the doctor's queue as an emergency session.
export default function EmergencyModal({ lang, bcp47, open, onClose, onSend, sending, sent }) {
  const [reason, setReason] = useState("");
  const { speak, setLang } = useVoice(lang);

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => {
    if (open && !sent) speak(t("emergencyPrompt", lang));
    return () => window.speechSynthesis?.cancel();
  }, [open, sent]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
          >
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-[#0F172A]">{t("emergencySent", lang)}</h3>
                <p className="text-slate-500 mt-1">The on-duty doctor has been notified.</p>
                <button onClick={onClose}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#0284C7] text-white font-semibold px-8 py-3 min-h-[48px] hover:bg-[#0369A1]">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">{t("emergencyTitle", lang)}</h3>
                  <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-slate-600 mb-3">{t("emergencyPrompt", lang)}</p>
                <textarea
                  className="w-full rounded-xl border-2 border-red-200 p-3 text-base focus:border-red-500 outline-none min-h-[96px]"
                  placeholder={t("emergencyPrompt", lang)}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex justify-center my-3">
                  <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => setReason((prev) => (prev ? prev + " " : "") + r)} />
                </div>
                <button
                  onClick={() => onSend(reason)}
                  disabled={sending || !reason.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-semibold py-4 min-h-[56px] hover:bg-red-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /> {t("emergencySend", lang)}</>}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}