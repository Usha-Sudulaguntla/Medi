import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, ShieldCheck, UserPlus, LogIn, Loader2, KeyRound, Volume2 } from "lucide-react";
import { t, bi, bcp47For } from "@/lib/i18n";
import { useVoice } from "@/lib/useVoice";
import VoiceMic from "@/components/kiosk/VoiceMic";
import { base44 } from "@/api/base44Client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// PatientAuth — patient authentication for the kiosk, fully multilingual.
// Registration follows the platform flow: register → OTP → verifyOtp → setToken,
// then a Patient profile is created with an auto-generated UHID.
// Login uses email + password directly. ABHA ID is optional and stored on the profile.
export default function PatientAuth({ lang, onAuthed }) {
  const bcp47 = bcp47For(lang);
  const { speak, setLang } = useVoice(lang);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [abhaId, setAbhaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => { setLang(bcp47); }, [bcp47, setLang]);
  useEffect(() => { speak(bi("authPrompt", lang)); return () => window.speechSynthesis?.cancel(); }, []);

  const generateUhid = () => `MK-2026-${Math.floor(10000 + Math.random() * 89999)}`;

  const handleRegister = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr(t("enterValidEmail", lang));
    if (!password) return setErr(t("passwordRequired", lang));
    if (!name) return setErr(t("nameRequired", lang));
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (e) {
      setErr(e?.message || t("registrationFailed", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setErr(null);
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      const uhid = generateUhid();
      const patient = await base44.entities.Patient.create({
        full_name: name,
        email,
        abha_id: abhaId || undefined,
        uhid,
        age: age ? Number(age) : undefined,
        gender,
        preferred_language: lang,
      });
      onAuthed({ patient, uhid });
    } catch (e) {
      setErr(e?.message || t("invalidCode", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr(t("enterValidEmail", lang));
    if (!password) return setErr(t("passwordRequired", lang));
    setLoading(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("returnTo", "/kiosk");
      window.history.replaceState({}, "", url);
      await base44.auth.loginViaEmailPassword(email, password);
      const existing = await base44.entities.Patient.filter({ email });
      const patient = existing && existing[0];
      onAuthed({
        patient: patient || { email, full_name: email.split("@")[0] },
        uhid: patient?.uhid,
      });
    } catch (e) {
      setErr(e?.message || t("loginFailed", lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <KioskHeader lang={lang} />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-7"
        >
          {showOtp ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-6 w-6 text-[#0284C7]" />
                <h2 className="text-2xl font-bold text-[#0F172A]">{t("verifyEmail", lang)}</h2>
              </div>
              <p className="text-sm text-slate-500 mb-1">{t("otpPrompt", lang)}</p>
              <p className="text-sm font-semibold text-[#0F172A] mb-5">{email}</p>
              {err && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>
              )}
              <div className="flex justify-center mb-5">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 text-base hover:bg-[#0369A1] min-h-[56px] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("continue", lang)}
              </button>
              <button
                onClick={async () => { try { await base44.auth.resendOtp(email); } catch {} }}
                className="w-full mt-3 text-sm text-[#0284C7] font-medium py-2"
              >
                {t("resendCode", lang)}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-1">
                {mode === "register" ? bi("register", lang) : bi("login", lang)}
              </h2>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-slate-500">
                  {mode === "register" ? t("registerDesc", lang) : t("loginDesc", lang)}
                </p>
                <button onClick={() => speak(bi("authPrompt", lang))} className="flex items-center gap-1 text-sm text-[#0284C7] font-medium ml-3 shrink-0">
                  <Volume2 className="h-4 w-4" /> {t("replay", lang)}
                </button>
              </div>

              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
                  placeholder={bi("email", lang)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <input
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base mb-3 focus:border-[#0284C7] outline-none min-h-[56px]"
                placeholder={bi("password", lang)}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {mode === "register" && (
                <>
                  <input
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base mb-2 focus:border-[#0284C7] outline-none min-h-[56px]"
                    placeholder={bi("fullName", lang)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="flex justify-center mb-3">
                    <VoiceMic lang={lang} bcp47={bcp47} onResult={(r) => setName(r)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
                      placeholder={bi("age", lang)}
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                    <select
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px] bg-white"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="male">{t("male", lang)}</option>
                      <option value="female">{t("female", lang)}</option>
                      <option value="other">{t("other", lang)}</option>
                    </select>
                  </div>
                  <div className="relative mb-3">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
                      placeholder={bi("abhaOptional", lang)}
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                    />
                  </div>
                </>
              )}

              {err && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>
              )}

              <button
                onClick={mode === "register" ? handleRegister : handleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 text-base hover:bg-[#0369A1] transition-colors min-h-[56px] disabled:opacity-60"
              >
                {loading ? t("pleaseWait", lang) : mode === "register" ? (
                  <><UserPlus className="h-5 w-5" /> {t("continue", lang)}</>
                ) : (
                  <><LogIn className="h-5 w-5" /> {t("continue", lang)}</>
                )}
              </button>

              <button
                onClick={() => { setErr(null); setMode(mode === "login" ? "register" : "login"); }}
                className="w-full mt-3 text-sm text-[#0284C7] font-medium py-2"
              >
                {mode === "login" ? t("newPatientRegister", lang) : t("alreadyRegisteredLogin", lang)}
              </button>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export function KioskHeader({ lang, step }) {
  return (
    <header className="bg-[#0F172A] text-white px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0284C7] flex items-center justify-center font-bold">M</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">MediKiosk</h1>
            <p className="text-[11px] text-slate-300">AI-Powered Clinical History Intake</p>
          </div>
        </div>
        {step && <div className="text-xs text-slate-300 hidden sm:block">Patient Kiosk</div>}
      </div>
    </header>
  );
}