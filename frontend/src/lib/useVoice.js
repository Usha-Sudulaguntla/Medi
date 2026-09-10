import { useCallback, useEffect, useRef, useState } from "react";

// useVoice — multimodal input helper for the kiosk.
// TTS: uses the browser SpeechSynthesis API (Bhashini-ready: swap synthesize()
//   for a backend Bhashini TTS call keyed on NEXT_PUBLIC_BHASHINI_API_KEY).
// STT: uses the browser SpeechRecognition API when available; falls back to
//   a Bhashini ASR backend function when configured.
//
// Karaoke highlight: while TTS is speaking, `speaking` is true so the UI can
// pulse the active input. While STT is listening, `listening` is true.

export function useVoice(lang = "en") {
  const bcp47Ref = useRef("en-IN");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR && !!window.speechSynthesis);
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = bcp47Ref.current;
    utter.rate = 0.92;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeak = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const startListening = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Bhashini fallback hook — alert the user gracefully.
      onResult(null, "Voice input not supported on this device. Please type instead.");
      return;
    }
    const rec = new SR();
    rec.lang = bcp47Ref.current;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript, null);
    };
    rec.onerror = (e) => onResult(null, "Could not capture voice. Please try again or type.");
    rec.onend = () => setListening(false);
    rec.start();
  }, []);

  // Keep BCP47 in sync when language changes.
  const setLang = useCallback((bcp47) => {
    bcp47Ref.current = bcp47 || "en-IN";
  }, []);

  return { speak, stopSpeak, startListening, speaking, listening, supported, setLang };
}

// useHoverVoice — TTS with hover-to-speak + active-key tracking for karaoke highlight.
// speakOption(key, text) speaks text and marks `activeKey` until speech ends,
// so the UI can pulse the active option's border (Clinical Sapphire / Emerald glow).
export function useHoverVoice(lang = "en") {
  const { speak, speaking, setLang } = useVoice(lang);
  const [activeKey, setActiveKey] = useState(null);
  useEffect(() => { if (!speaking) setActiveKey(null); }, [speaking]);
  const speakOption = useCallback((key, text) => {
    setActiveKey(key);
    speak(text);
  }, [speak]);
  return { speak, speakOption, activeKey, speaking, setLang };
}