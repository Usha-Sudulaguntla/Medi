import React, { useState, useEffect } from "react";
import DoctorLogin from "@/components/doctor/DoctorLogin";
import QueueDashboard from "@/components/doctor/QueueDashboard";
import PhysicianDashboard from "@/components/doctor/PhysicianDashboard";
import { base44 } from "@/api/base44Client";

// DoctorPortal — orchestrates doctor login → queue → physician dashboard.
export default function DoctorPortal() {
  const [doctor, setDoctor] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState("queue"); // queue | patient
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        try {
          const me = await base44.auth.me();
          // Grant access only to active doctors in the Doctor database.
          const docs = await base44.entities.Doctor.filter({ email: me.email });
          const doc = docs && docs[0];
          if (doc && doc.active) {
            setDoctor({ user: me, hospital: doc.hospital, doctorId: me.email, profile: doc });
          }
        } catch { /* not authorized */ }
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="w-8 h-8 border-4 border-slate-600 border-t-white rounded-full animate-spin" />
    </div>;
  }

  if (!doctor) {
    return <DoctorLogin onAuthed={setDoctor} />;
  }

  if (view === "patient" && activeSession) {
    return (
      <PhysicianDashboard
        session={activeSession}
        doctor={doctor}
        onBack={() => { setView("queue"); setActiveSession(null); }}
        onResolved={() => { setView("queue"); setActiveSession(null); }}
      />
    );
  }

  return (
    <QueueDashboard
      doctor={doctor}
      onSelectPatient={(s) => { setActiveSession(s); setView("patient"); }}
    />
  );
}