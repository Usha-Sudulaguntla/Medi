import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Mail, Loader2, ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// DoctorSignUp — lets a doctor set their own sign-in password.
// Access is still gated by the admin: only emails present in the Doctor
// database (and active) may register. Flow: register → OTP → verifyOtp → portal.
export default function DoctorSignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const handleRegister = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr("Enter a valid email.");
    if (!password || password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setLoading(true);
    try {
      // Only doctors the admin has added and activated may sign up.
      const docs = await base44.entities.Doctor.filter({ email });
      const doc = docs && docs[0];
      if (!doc) return setErr("This email is not in the doctor database. Ask your administrator to add you first.");
      if (!doc.active) return setErr("Your doctor access is disabled. Contact your administrator.");
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (e) {
      const m = e?.message || "Registration failed.";
      if (/exist|already|registered/i.test(m)) {
        setErr("An account with this email already exists. Use 'Back to Sign In' or the forgot-password link.");
      } else {
        setErr(m);
      }
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setErr(null);
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      // Hard redirect so the auth provider re-initializes for the portal.
      window.location.href = "/doctor";
    } catch (e) {
      setErr(e?.message || "Invalid code.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-[#0D9488] flex items-center justify-center">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Doctor Sign-Up</h1>
            <p className="text-xs text-slate-500">Set your password to access the portal</p>
          </div>
        </div>

        {showOtp ? (
          <>
            <p className="text-sm text-slate-500 mb-1">Enter the code sent to</p>
            <p className="text-sm font-semibold text-[#0F172A] mb-5">{email}</p>
            {err && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
            <div className="flex justify-center mb-5">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button onClick={handleVerify} disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 min-h-[56px] disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Verify & Continue</>}
            </button>
            <button onClick={async () => { try { await base44.auth.resendOtp(email); } catch {} }} className="w-full mt-3 text-sm text-[#0284C7] font-medium py-2">
              Resend code
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">Your administrator must have added your email to the doctor database first.</p>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1">Email</label>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
                placeholder="you@hospital.in" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1">Password</label>
            <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base mb-3 focus:border-[#0284C7] outline-none min-h-[56px]"
              type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="block text-sm font-semibold text-[#0F172A] mb-1">Confirm Password</label>
            <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base mb-3 focus:border-[#0284C7] outline-none min-h-[56px]"
              type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {err && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
            <button onClick={handleRegister} disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 min-h-[56px] disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5" /> Set Password</>}
            </button>
            <button onClick={() => navigate("/doctor")} className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-slate-500 py-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}