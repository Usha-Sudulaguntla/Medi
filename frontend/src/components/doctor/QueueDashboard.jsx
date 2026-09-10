import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertTriangle, CheckCircle2, Clock, Stethoscope, LogOut, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";

// QueueDashboard — real-time patient queue for the doctor.
// Emergency red-flag patients bump to the top (flashing red). "AI History Ready"
// shows a green checkmark when intake is complete.
export default function QueueDashboard({ doctor, onSelectPatient }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const list = await base44.entities.IntakeSession.filter({ status: "history_ready" }, "-created_date", 100);
      setSessions(list || []);
    } catch { setSessions([]); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.IntakeSession.subscribe(() => load());
    return unsub;
  }, []);

  const matches = (s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (s.patient_name || "").toLowerCase().includes(q) ||
      (s.uhid || "").toLowerCase().includes(q) ||
      (s.abha_id || "").toLowerCase().includes(q)
    );
  };

  // Sort: emergency first, then newest.
  const sorted = [...sessions].sort((a, b) => {
    if (a.emergency_flag !== b.emergency_flag) return a.emergency_flag ? -1 : 1;
    return 0;
  });

  const emergencyCount = sorted.filter((s) => s.emergency_flag).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Doctor top bar */}
      <header className="bg-[#0F172A] text-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#0284C7] flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Doctor Portal</h1>
              <p className="text-[11px] text-slate-300">{doctor?.hospital || "Hospital"} · {doctor?.doctorId}</p>
            </div>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Patient Queue</h2>
            <p className="text-sm text-slate-500">Live waiting list · today</p>
          </div>
          <div className="relative sm:ml-auto sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              className="w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 py-3 text-base bg-white focus:border-[#0284C7] outline-none min-h-[48px]"
              placeholder="Search name, ABHA ID, or UHID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={Clock} label="Waiting" value={sessions.length} color="#0284C7" />
          <StatCard icon={CheckCircle2} label="History Ready" value={sessions.length} color="#22C55E" />
          <StatCard icon={AlertTriangle} label="Emergency" value={emergencyCount} color="#EF4444" pulse={emergencyCount > 0} />
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading queue…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No patients waiting. New intakes will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.filter(matches).map((s) => (
                <motion.button
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => onSelectPatient(s)}
                  className={`w-full text-left rounded-2xl border-2 bg-white p-4 flex items-center gap-4 transition-all hover:shadow-md ${
                    s.emergency_flag ? "border-red-400 animate-pulse" : "border-slate-200"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-white ${
                      s.emergency_flag ? "bg-red-500" : "bg-[#0284C7]"
                    }`}
                  >
                    {(s.patient_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold truncate ${s.emergency_flag ? "text-red-600" : "text-[#0F172A]"}`}>
                        {s.patient_name || "Unknown"}
                      </span>
                      {s.emergency_flag && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 uppercase">
                          <AlertTriangle className="h-3.5 w-3.5" /> Emergency
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                      <span>UHID: {s.uhid || "—"}</span>
                      {s.abha_id && <span>ABHA: {s.abha_id}</span>}
                      <span className="uppercase">{s.track === "ayush_ayurveda" ? "AYUSH" : "General"}</span>
                    </div>
                    {s.chief_complaint_en && (
                      <p className="text-sm text-slate-600 mt-1 truncate">{s.chief_complaint_en}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> AI History Ready
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(s.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, pulse }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200 p-4 ${pulse ? "animate-pulse" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#0F172A]">{value}</div>
    </div>
  );
}