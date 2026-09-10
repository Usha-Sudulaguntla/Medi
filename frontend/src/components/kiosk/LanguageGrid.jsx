import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";

// LanguageGrid — Step 1 mandatory language selection, 8 Indian languages.
export default function LanguageGrid({ onSelect }) {
  const { speak } = useVoice("en");
  useEffect(() => {
    speak("Select your language. अपनी भाषा चुनें.");
    return () => window.speechSynthesis?.cancel();
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col" style={{ backgroundColor: "#F8FAFC" }}>
      <header className="bg-[#0F172A] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0284C7] flex items-center justify-center font-bold text-lg">M</div>
          <div>
            <h1 className="text-xl font-bold leading-tight">MediKiosk</h1>
            <p className="text-xs text-slate-300">AI-Powered Clinical History Intake</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-center text-3xl font-bold text-[#0F172A]">
              Select Your Language
            </h2>
            <button onClick={() => speak("Select your language. अपनी भाषा चुनें.")} className="flex items-center gap-1 text-sm text-[#0284C7] font-medium">
              <Volume2 className="h-4 w-4" /> Replay
            </button>
          </div>
          <p className="text-center text-slate-500 mb-10">अपनी भाषा चुनें · Choose your preferred language</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LANGUAGES.map((lang, i) => (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(lang)}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#0284C7] hover:shadow-xl transition-all p-6 min-h-[140px]"
              >
                <span className="text-4xl">{lang.flag}</span>
                <span className="text-lg font-bold text-[#0F172A]">{lang.native}</span>
                <span className="text-sm text-slate-500">{lang.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}