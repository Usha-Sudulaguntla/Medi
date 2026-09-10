import React, { useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useVoice } from "@/lib/useVoice";
import { t } from "@/lib/i18n";

// VoiceMic — pulsing mic button for Bhashini-style speech-to-text.
// Calls onResult(transcript) when speech is captured.
export default function VoiceMic({ lang, bcp47, onResult, active = true }) {
  const { startListening, listening, supported, setLang } = useVoice(lang);
  const [err, setErr] = useState(null);

  React.useEffect(() => {
    setLang(bcp47);
  }, [bcp47, setLang]);

  const handleTap = () => {
    setErr(null);
    startListening((transcript, error) => {
      if (error) setErr(error);
      else if (transcript) onResult(transcript);
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleTap}
        disabled={!active}
        aria-label={t("tapToSpeak", lang)}
        className="relative flex h-16 w-16 items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-40"
        style={{ backgroundColor: listening ? "#EF4444" : "#0284C7", color: "#fff" }}
      >
        {listening ? (
          <Square className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
        {listening && (
          <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" />
        )}
      </button>
      <span className="text-sm font-medium text-slate-600 min-h-[1.25rem]">
        {listening ? (
          <span className="flex items-center gap-1 text-red-600">
            <Loader2 className="h-3 w-3 animate-spin" /> {t("listening", lang)}
          </span>
        ) : err ? (
          <span className="text-red-600">{err}</span>
        ) : (
          t("tapToSpeak", lang)
        )}
      </span>
    </div>
  );
}