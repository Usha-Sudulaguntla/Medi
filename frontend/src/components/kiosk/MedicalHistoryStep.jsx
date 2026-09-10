import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Volume2, Activity } from "lucide-react";
import { t } from "@/lib/i18n";
import { useHoverVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// MedicalHistoryStep — structured chronic / past history in the patient's
// selected language using Yes / No toggle cards. Conditional text fields
// (with voice input) appear for Past Surgeries, Drug Allergies, Current Medications.
const QUESTIONS = [
  { key: "diabetes", labelKey: "diabetes" },
  { key: "hypertension", labelKey: "hypertension" },
  { key: "asthma", labelKey: "asthma" },
  { key: "pastSurgeries", labelKey: "pastSurgeries", detailKey: "surgeriesDetailsPh" },
  { key: "drugAllergies", labelKey: "drugAllergies", detailKey: "allergyDetailsPh" },
  { key: "currentMedications", labelKey: "currentMeds", detailKey: "medsDetailsPh" },
];

export default function MedicalHistoryStep({ lang, bcp47, data, onChange, onNext, onBack }) {
  const { speak, speakOption, activeKey, setLang } = useHoverVoice(lang);
  const [answers, setAnswers] = useState(data || {});

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => {
    speak(t("historyTitle", lang));
    return () => window.speechSynthesis?.cancel();
  }, []);

  const setBool = (key, val) => {
    const next = { ...answers, [key]: val };
    setAnswers(next);
    onChange(next);
  };
  const setDetail = (key, val) => {
    const next = { ...answers, [`${key}Details`]: val };
    setAnswers(next);
    onChange(next);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-6 w-6 text-[#0284C7]" />
            <h2 className="text-2xl font-bold text-[#0F172A]">{t("historyTitle", lang)}</h2>
            <button onClick={() => speak(t("historySubtitle", lang))} className="ml-auto flex items-center gap-1 text-sm text-[#0284C7] font-medium">
              <Volume2 className="h-4 w-4" /> {t("replay", lang)}
            </button>
          </div>
          <p className="text-slate-500 mb-6">{t("historySubtitle", lang)}</p>

          {QUESTIONS.map((q, qi) => {
            const val = answers[q.key];
            const isActive = activeKey === `q-${q.key}`;
            return (
              <motion.div key={q.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.05 }} className="mb-4">
                <p
                  className={`text-lg font-semibold text-[#0F172A] mb-2 cursor-pointer rounded-lg px-1 ${isActive ? "text-[#0284C7]" : ""}`}
                  onMouseEnter={() => speakOption(`q-${q.key}`, t(q.labelKey, lang))}
                >
                  {t(q.labelKey, lang)}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["yes", "no"].map((opt) => {
                    const optVal = opt === "yes";
                    const sel = val === optVal;
                    const optActive = activeKey === `${q.key}-${opt}`;
                    return (
                      <button
                        key={opt}
                        onClick={() => setBool(q.key, optVal)}
                        onMouseEnter={() => speakOption(`${q.key}-${opt}`, t(opt, lang))}
                        className={`flex items-center justify-center rounded-xl border-2 py-4 font-bold text-lg min-h-[64px] transition-all ${
                          sel
                            ? optVal
                              ? "border-[#0284C7] bg-sky-50 text-[#0284C7]"
                              : "border-slate-400 bg-slate-50 text-slate-600"
                            : optActive
                            ? "border-[#0284C7] shadow-[0_0_0_4px_rgba(2,132,199,0.18)] bg-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {t(opt, lang)}
                      </button>
                    );
                  })}
                </div>
                {q.detailKey && val === true && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">{t("pleaseSpecify", lang)}</p>
                    <input
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
                      placeholder={t(q.detailKey, lang)}
                      value={answers[`${q.key}Details`] || ""}
                      onChange={(e) => setDetail(q.key, e.target.value)}
                    />
                    <div className="flex justify-center mt-2">
                      <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => setDetail(q.key, r)} />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          <div className="flex justify-between mt-4">
            <button onClick={onBack} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-600 min-h-[56px]">
              <ArrowLeft className="h-5 w-5" /> {t("back", lang)}
            </button>
            <button onClick={onNext} className="flex items-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold px-8 py-4 min-h-[56px] hover:bg-[#0369A1]">
              {t("next", lang)} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}