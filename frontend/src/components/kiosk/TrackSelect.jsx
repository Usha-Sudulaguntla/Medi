import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Leaf, ArrowRight } from "lucide-react";
import { t, bi } from "@/lib/i18n";
import { useHoverVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { KioskHeader } from "@/components/kiosk/PatientAuth";

// TrackSelect — choose General Medicine (Allopathy) or AYUSH (Ayurveda).
export default function TrackSelect({ lang, bcp47, onSelect }) {
  const { speak, speakOption, activeKey, setLang } = useHoverVoice(lang);
  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("trackSelection", lang)); return () => window.speechSynthesis?.cancel(); }, []);

  const handleVoice = (r) => {
    const x = (r || "").toLowerCase();
    if (/(ayush|ayurved|आयुर्वेद|आयुष|herbal)/.test(x)) onSelect("ayush_ayurveda");
    else if (/(general|allopath|medicine|modern|सामान्य|एलोपैथ)/.test(x)) onSelect("general_medicine");
  };

  const tracks = [
    {
      key: "general_medicine",
      title: bi("generalMedicine", lang),
      icon: Stethoscope,
      color: "#0284C7",
      bg: "from-sky-50 to-white",
      desc: "Modern medicine, diagnostics & prescriptions",
    },
    {
      key: "ayush_ayurveda",
      title: bi("ayushAyurveda", lang),
      icon: Leaf,
      color: "#0D9488",
      bg: "from-emerald-50 to-white",
      desc: "Ahara-Vihara & Dashavidha Pariksha assessment",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} step />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-[#0F172A] mb-2">{bi("trackSelection", lang)}</h2>
          <p className="text-center text-slate-500 mb-8">Choose your treatment pathway</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tracks.map((tr, i) => (
              <motion.button
                key={tr.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(tr.key)}
                onMouseEnter={() => speakOption(tr.key, `${tr.title}. ${tr.desc}`)}
                className={`flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-b ${tr.bg} border-2 p-8 min-h-[220px] text-center transition-all ${
                  activeKey === tr.key ? "border-[#0284C7] shadow-[0_0_0_4px_rgba(2,132,199,0.18)]" : "border-slate-200 hover:border-current"
                }`}
                style={{ borderColor: undefined }}
              >
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: tr.color }}
                >
                  <tr.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">{tr.title}</h3>
                <p className="text-sm text-slate-500">{tr.desc}</p>
                <span className="mt-auto flex items-center gap-1 text-sm font-semibold" style={{ color: tr.color }}>
                  {t("continue", lang)} <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-1 mt-8">
            <VoiceMic lang={lang} bcp47={bcp47} onResult={handleVoice} />
            <span className="text-xs text-slate-400">Say "General Medicine" or "Ayurveda"</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}