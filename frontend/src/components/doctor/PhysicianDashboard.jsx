import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Save, Pill, FileText,
  Stethoscope, Leaf, ShieldAlert, Loader2, Activity, User, Fingerprint,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

// PhysicianDashboard — <30-second structured English EMR read.
// Inline edit/accept/reject, one-click Confirm & Save:
//   ABHA ID → FHIR R4 JSON to national PHR; no ABHA → save to HIS (local UHID).
export default function PhysicianDashboard({ session, doctor, onBack, onResolved }) {
  const [summary, setSummary] = useState(session.summary_en || "");
  const [notes, setNotes] = useState(session.doctor_notes || "");
  const [action, setAction] = useState(null); // accept | reject
  const [saving, setSaving] = useState(false);
  const [savedFhir, setSavedFhir] = useState(null);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (session.patient_id && session.patient_id !== "unknown") {
      base44.entities.MedicalDocument.filter({ patient_id: session.patient_id })
        .then(setDocs).catch(() => setDocs([]));
    }
  }, [session.id]);

  const allMeds = Array.from(new Set(docs.flatMap((d) => d.medications || [])));
  const abnormal = docs.flatMap((d) => d.abnormal_values || []);

  // Naive drug-interaction alert (demo): flag if both listed interacting pairs present.
  const INTERACTION_PAIRS = [
    ["warfarin", "aspirin"], ["ibuprofen", "warfarin"], ["metformin", "contrast"],
  ];
  const lowerMeds = allMeds.map((m) => m.toLowerCase());
  const interactions = INTERACTION_PAIRS.filter(([a, b]) =>
    lowerMeds.some((m) => m.includes(a)) && lowerMeds.some((m) => m.includes(b))
  );

  const buildFhir = () => ({
    resourceType: "Composition",
    id: `medikiosk-${session.id}`,
    status: action === "reject" ? "entered-in-error" : "final",
    type: {
      coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }],
    },
    subject: {
      identifier: session.abha_id
        ? { system: "https://healthid.ndhm.gov.in", value: session.abha_id }
        : { system: "http://medikiosk.in/uhid", value: session.uhid },
      display: session.patient_name,
    },
    author: [{ display: doctor?.doctorId || "Attending Physician" }],
    date: new Date().toISOString(),
    title: "MediKiosk Clinical History Intake",
    section: [
      {
        title: "Chief Complaint (SOCRATES)",
        text: {
          status: "generated",
          div: session.chief_complaint_en || session.chief_complaint || "",
        },
      },
      {
        title: "Structured Clinical Summary",
        text: { status: "generated", div: summary },
      },
      ...(session.track === "ayush_ayurveda"
        ? [{
            title: "AYUSH Clinical Synthesis",
            text: { status: "generated", div: JSON.stringify(session.ayush_assessment || {}) },
          }]
        : []),
      {
        title: "Current Medications",
        text: { status: "generated", div: allMeds.join(", ") || "none" },
      },
      {
        title: "Physician Notes",
        text: { status: "generated", div: notes },
      },
    ],
  });

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const fhir = buildFhir();
      const status = action === "reject" ? "rejected" : "confirmed";
      await base44.entities.IntakeSession.update(session.id, {
        status,
        doctor_id: doctor?.user?.id,
        doctor_notes: notes,
        summary_en: summary,
        confirmed_at: new Date().toISOString(),
      });
      if (session.abha_id && action !== "reject") {
        // Transmit FHIR R4 to ABHA PHR (simulated transmission; real push needs ABDM gateway).
        setSavedFhir(fhir);
      }
      setSaving(false);
      onResolved(status, fhir);
    } catch (e) {
      setSaving(false);
      alert("Could not save. Please try again.");
    }
  };

  const isAyush = session.track === "ayush_ayurveda";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0F172A] text-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Queue
          </button>
          <div className="ml-2">
            <h1 className="text-lg font-bold leading-tight">{session.patient_name}</h1>
            <p className="text-[11px] text-slate-300">UHID: {session.uhid || "—"} {session.abha_id && `· ABHA: ${session.abha_id}`}</p>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${
              isAyush ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
            }`}
          >
            {isAyush ? <Leaf className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
            {isAyush ? "AYUSH" : "General Medicine"}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Emergency banner */}
        {session.emergency_flag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 flex items-center gap-3 animate-pulse"
          >
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-bold text-red-700">EMERGENCY RED FLAG DETECTED</p>
              <p className="text-sm text-red-600">{session.emergency_reason || "Critical symptoms indicated. Prioritize immediately."}</p>
            </div>
          </motion.div>
        )}

        {/* Patient snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Snap icon={User} label="Patient" value={session.patient_name} />
          <Snap icon={Fingerprint} label="UHID" value={session.uhid || "—"} />
          <Snap icon={Activity} label="Intake Language" value={session.language?.toUpperCase()} />
          <Snap icon={FileText} label="Documents" value={docs.length} />
        </div>

        {/* Chief complaint */}
        <Section title="Chief Complaint (SOCRATES)" icon={Activity}>
          <p className="text-[#0F172A]">{session.chief_complaint_en || session.chief_complaint || "—"}</p>
          {session.socrates && Object.keys(session.socrates).length > 0 && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Meta k="Onset" v={session.socrates.onset} />
              <Meta k="Character" v={session.socrates.character} />
              <Meta k="Radiation" v={session.socrates.radiation} />
              <Meta k="Severity" v={`${session.socrates.severity}/10`} />
            </div>
          )}

        </Section>
                {/* Chief complaint */}
        <Section title="Chief Complaint (SOCRATES)" icon={Activity}>
          <p className="text-[#0F172A]">{session.chief_complaint_en || session.chief_complaint || "—"}</p>
          {session.socrates && Object.keys(session.socrates).length > 0 && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Meta k="Onset" v={session.socrates.onset} />
              <Meta k="Character" v={session.socrates.character} />
              <Meta k="Radiation" v={session.socrates.radiation} />
              <Meta k="Severity" v={`${session.socrates.severity}/10`} />
            </div>
          )}
        </Section>

        {/* Severity comparison: patient-reported vs AI-estimated */}
        <div className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 mb-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Patient-reported severity</p>
            <p className="text-2xl font-bold text-[#0F172A]">{session.socrates?.severity ?? "—"}/10</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <p className="text-xs text-slate-500 font-medium">AI-estimated severity (from language)</p>
            <p className="text-2xl font-bold text-[#0284C7]">{session.severity_score ?? "—"}/10</p>
            {session.severity_reasoning && (
              <p className="text-xs text-slate-500 mt-1">{session.severity_reasoning}</p>
            )}
          </div>
        </div>

        {/* AYUSH synthesis */}

        {/* AYUSH synthesis */}
        {isAyush && session.ayush_assessment && (
          <Section title="AYUSH Clinical Synthesis" icon={Leaf} accent="#0D9488">
            <div className="space-y-1.5 text-sm">
              {Object.entries(session.ayush_assessment).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="capitalize text-slate-500">{k}</span>
                  <span className="font-medium text-[#0F172A]">{v.dosha || v.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Drug interaction alerts */}
        {interactions.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">Drug Interaction Alert</p>
              <p className="text-sm text-amber-700">
                Potential interaction between: {interactions.map((p) => p.join(" + ")).join("; ")}
              </p>
            </div>
          </div>
        )}

        {/* Abnormal lab values */}
        {abnormal.length > 0 && (
          <Section title="Abnormal Lab Values" icon={AlertTriangle}>
            <div className="flex flex-wrap gap-2">
              {abnormal.map((av, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3 w-3" /> {av.test}: {av.value} {av.unit}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Current medications */}
        {allMeds.length > 0 && (
          <Section title="Current Medications (from scanned history)" icon={Pill}>
            <div className="flex flex-wrap gap-2">
              {allMeds.map((m, i) => (
                <span key={i} className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">{m}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Editable structured summary */}
        <Section title="Structured EMR Summary (English) — editable" icon={FileText}>
          <textarea
            className="w-full resize-y rounded-xl border-2 border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-[#0284C7] outline-none min-h-[160px]"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Section>

        {/* Physician notes */}
        <Section title="Physician Notes" icon={Stethoscope}>
          <textarea
            className="w-full resize-y rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-[#0284C7] outline-none min-h-[80px]"
            placeholder="Add clinical notes, plan, prescription guidance…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Section>

        {/* Action controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setAction("reject")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 font-semibold min-h-[56px] ${
              action === "reject" ? "border-red-500 bg-red-50 text-red-600" : "border-slate-200 text-slate-600"
            }`}
          >
            <XCircle className="h-5 w-5" /> Reject
          </button>
          <button
            onClick={() => setAction("accept")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 font-semibold min-h-[56px] ${
              action === "accept" ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-600"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" /> Accept
          </button>
          <button
            onClick={handleConfirm}
            disabled={!action || saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] text-white font-semibold px-6 py-4 min-h-[56px] hover:bg-[#0369A1] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Confirm & Save
          </button>
        </div>

        {/* FHIR confirmation */}
        {savedFhir && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-emerald-800">
                {session.abha_id
                  ? "FHIR R4 payload transmitted to ABHA Personal Health Record"
                  : "Clinical note saved to Hospital Information System (HIS)"}
              </span>
            </div>
            <pre className="text-xs bg-white rounded-lg p-3 overflow-x-auto max-h-48 text-slate-700">
              {JSON.stringify(savedFhir, null, 2)}
            </pre>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, children, accent }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5" style={{ color: accent || "#0284C7" }} />
        <h3 className="font-bold text-[#0F172A]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Snap({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3">
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="font-semibold text-[#0F172A] truncate">{value ?? "—"}</div>
    </div>
  );
}

function Meta({ k, v }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="font-medium text-[#0F172A] truncate">{v || "—"}</div>
    </div>
  );
}