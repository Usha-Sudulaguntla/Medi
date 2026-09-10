import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Volume2, Leaf } from "lucide-react";
import { t } from "@/lib/i18n";
import { AYUSH_QUESTIONS, ayushT } from "@/lib/ayushI18n";
import { useHoverVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// AyushStep — 10-Question Ayurvedic Diagnostic Framework (Dashavidha Pariksha).
// Questions and options render in the patient's selected language; the `dosha`
// label stays in English as a clinical EMR term for the doctor's summary.
export default function AyushStep({ lang, bcp47, data, onChange, onNext, onBack }) {
  const { speak, speakOption, activeKey, setLang } = useHoverVoice(lang);
  const [answers, setAnswers] = useState(data || {});

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => {
    speak(ayushT(AYUSH_QUESTIONS[0].prompt, lang));
    return () => window.speechSynthesis?.cancel();
  }, [lang]);

  const choose = (qKey, optIdx) => {
    const q = AYUSH_QUESTIONS.find((x) => x.key === qKey);
    const opt = q.options[optIdx];
    const next = { ...answers, [qKey]: { idx: optIdx, label: ayushT(opt.label, "en"), labelLang: ayushT(opt.label, lang), dosha: opt.dosha } };
    setAnswers(next);
    onChange(next);
    const idx = AYUSH_QUESTIONS.findIndex((x) => x.key === qKey);
    if (idx < AYUSH_QUESTIONS.length - 1) {
      setTimeout(() => speak(ayushT(AYUSH_QUESTIONS[idx + 1].prompt, lang)), 350);
    }
  };

  const setOther = (qKey, text) => {
    const next = { ...answers, [qKey]: { idx: "other", label: "Other", detail: text, dosha: "custom" } };
    setAnswers(next);
    onChange(next);
  };

  const clearOther = (qKey) => {
    const next = { ...answers };
    delete next[qKey];
    setAnswers(next);
    onChange(next);
  };

  const indexFor = (x) => {
    if (/(first|one|पहला|1|1st)/.test(x)) return 0;
    if (/(second|two|दूसरा|2|2nd)/.test(x)) return 1;
    if (/(third|three|तीसरा|3|3rd)/.test(x)) return 2;
    if (/(fourth|four|चौथा|4|4th)/.test(x)) return 3;
    return -1;
  };
  const handleVoice = (qKey, r) => {
    const idx = indexFor((r || "").toLowerCase());
    if (idx >= 0) choose(qKey, idx);
  };

  const answeredCount = AYUSH_QUESTIONS.filter((q) => answers[q.key]).length;
  const allAnswered = answeredCount === AYUSH_QUESTIONS.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="h-6 w-6 text-[#0D9488]" />
            <h2 className="text-2xl font-bold text-[#0F172A]">{t("ayushTitle", lang)}</h2>
            <button onClick={() => speak(ayushT(AYUSH_QUESTIONS[0].prompt, lang))} className="ml-auto flex items-center gap-1 text-sm text-[#0D9488] font-medium">
              <Volume2 className="h-4 w-4" /> {t("replay", lang)}
            </button>
          </div>
          <p className="text-slate-500 mb-2">{t("ayushSubtitle", lang)}</p>
          <div className="mb-6 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-[#0D9488] transition-all" style={{ width: `${(answeredCount / AYUSH_QUESTIONS.length) * 100}%` }} />
          </div>

          {AYUSH_QUESTIONS.map((q, qi) => (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.04 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0D9488] text-white text-sm font-bold">{q.n}</span>
                <span className="text-xs font-semibold text-[#0D9488] bg-emerald-50 px-2 py-1 rounded-md">{ayushT(q.title, lang)}</span>
              </div>
              <p
                className={`text-lg font-semibold text-[#0F172A] mb-3 cursor-pointer rounded-lg px-1 ${
                  activeKey === `q-${q.key}` ? "text-[#0D9488]" : ""
                }`}
                onMouseEnter={() => speakOption(`q-${q.key}`, ayushT(q.prompt, lang))}
              >
                {ayushT(q.prompt, lang)}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const sel = answers[q.key]?.idx === oi;
                  const isActive = activeKey === `${q.key}-${oi}`;
                  return (
                    <button
                      key={oi}
                      onClick={() => choose(q.key, oi)}
                      onMouseEnter={() => speakOption(`${q.key}-${oi}`, ayushT(opt.label, lang))}
                      className={`w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all min-h-[64px] ${
                        sel ? "border-[#0D9488] bg-emerald-50 shadow-sm"
                        : isActive ? "border-[#0D9488] shadow-[0_0_0_4px_rgba(13,148,136,0.18)] bg-white"
                        : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{oi + 1}</span>
                      <span className="flex-1">
                        <span className="block text-base text-[#0F172A]">{ayushT(opt.label, lang)}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{opt.dosha}</span>
                      </span>
                    </button>
                  );
                })}
                <div className={`rounded-xl border-2 p-4 transition-all ${answers[q.key]?.idx === "other" ? "border-[#0D9488] bg-emerald-50" : "border-dashed border-slate-300 bg-white"}`}>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={answers[q.key]?.idx === "other"}
                      onChange={(e) => (e.target.checked ? setOther(q.key, answers[q.key]?.detail || "") : clearOther(q.key))}
                    />
                    {t("otherSpecify", lang)}
                  </label>
                  {answers[q.key]?.idx === "other" && (
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base focus:outline-none focus:border-[#0D9488] min-h-[48px]"
                      placeholder={t("typeAnswer", lang)}
                      value={answers[q.key]?.detail || ""}
                      onChange={(e) => setOther(q.key, e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => handleVoice(q.key, r)} />
              </div>
            </motion.div>
          ))}

          <div className="flex justify-between mt-4">
            <button onClick={onBack} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-600 min-h-[56px]">
              <ArrowLeft className="h-5 w-5" /> {t("back", lang)}
            </button>
            <button
              onClick={onNext}
              disabled={!allAnswered}
              className="flex items-center gap-2 rounded-xl bg-[#0D9488] text-white font-semibold px-8 py-4 min-h-[56px] hover:bg-[#0F766E] disabled:opacity-50"
            >
              {t("next", lang)} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}