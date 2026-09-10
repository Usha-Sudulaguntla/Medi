import React, { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, LogIn, Building2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// DoctorLogin — dedicated doctor login: Hospital Name, Doctor ID, Password.
// Doctor ID maps to the platform email; role 'admin' = authorized doctor.
const HOSPITALS = [
  "AIIA, New Delhi",
  "AIIMS Delhi",
  "King George's Hospital, Lucknow",
  "NIMHANS, Bengaluru",
  "JIPMER, Puducherry",
];

export default function DoctorLogin({ onAuthed }) {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(HOSPITALS[0]);
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleLogin = async () => {
    setErr(null);
    if (!doctorId || !password) return setErr("Enter Doctor ID and Password.");
    setLoading(true);
    try {
      // Map Doctor ID to an email (allow raw email or treat as handle).
      const email = doctorId.includes("@") ? doctorId : `${doctorId}@medikiosk.in`;
      // Ensure the platform redirect lands back on the doctor portal.
      const url = new URL(window.location.href);
      url.searchParams.set("returnTo", "/doctor");
      window.history.replaceState({}, "", url);
      await base44.auth.loginViaEmailPassword(email, password);
      const me = await base44.auth.me();
      // Grant access only to doctors registered in the Doctor database.
      const docs = await base44.entities.Doctor.filter({ email: me.email });
      const doc = docs && docs[0];
      if (!doc) {
        setErr("No doctor profile found for this account. Ask your administrator to add you.");
        await base44.auth.logout();
        setLoading(false);
        return;
      }
      if (!doc.active) {
        setErr("Your doctor access has been disabled. Contact your administrator.");
        await base44.auth.logout();
        setLoading(false);
        return;
      }
      onAuthed({ user: me, hospital: doc.hospital || hospital, doctorId: me.email, profile: doc });
    } catch (e) {
      setErr(e?.message || "Login failed. Check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-[#0284C7] flex items-center justify-center">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Doctor Portal</h1>
            <p className="text-xs text-slate-500">Authorized physician access only</p>
          </div>
        </div>

        <label className="block text-sm font-semibold text-[#0F172A] mb-1">Hospital Name</label>
        <div className="relative mb-4">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <select
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px] bg-white"
          >
            {HOSPITALS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>

        <label className="block text-sm font-semibold text-[#0F172A] mb-1">Doctor ID</label>
        <div className="relative mb-4">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3.5 text-base focus:border-[#0284C7] outline-none min-h-[56px]"
            placeholder="doctor.id@hospital.in"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          />
        </div>

        <label className="block text-sm font-semibold text-[#0F172A] mb-1">Password</label>
        <input
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base mb-4 focus:border-[#0284C7] outline-none min-h-[56px]"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {err && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold py-4 text-base hover:bg-[#0369A1] disabled:opacity-60 min-h-[56px]"
        >
          {loading ? "Verifying…" : <><LogIn className="h-5 w-5" /> Sign In</>}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Access is granted by the hospital administrator from the Doctor database.
        </p>
        <button onClick={() => navigate("/doctor/signup")} className="mt-3 w-full text-sm text-[#0284C7] font-medium py-2">
          First time? Set your password
        </button>
        <button onClick={() => navigate("/forgot-password")} className="w-full text-sm text-slate-400 py-1">
          Forgot password?
        </button>
      </motion.div>
    </div>
  );
}