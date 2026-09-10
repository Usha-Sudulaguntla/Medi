-- MediKiosk schema — replaces Base44's built-in entity store.
-- Run with: psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT, -- null for Google-only accounts
  role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'doctor', 'user')),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  google_id      TEXT UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registration email-OTP verification codes (6-digit, short-lived).
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id);

-- Forgot-password reset links (random token, short-lived).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS doctors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT NOT NULL,
  hospital       TEXT,
  license_id     TEXT,
  specialization TEXT,
  email          TEXT NOT NULL,
  phone          TEXT,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid               TEXT UNIQUE, -- e.g. MK-2026-00001, generated at insert time
  full_name          TEXT NOT NULL,
  abha_id            TEXT,
  email              TEXT,
  phone              TEXT,
  age                NUMERIC,
  gender             TEXT CHECK (gender IN ('male', 'female', 'other')),
  preferred_language TEXT,
  track              TEXT CHECK (track IN ('general_medicine', 'ayush_ayurveda')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name          TEXT,
  uhid                  TEXT,
  abha_id               TEXT,
  language              TEXT,
  track                 TEXT CHECK (track IN ('general_medicine', 'ayush_ayurveda')),
  chief_complaint       TEXT,
  chief_complaint_en    TEXT,
  socrates              JSONB,
  ayush_assessment      JSONB,
  medical_history       TEXT,
  allergies             TEXT,
  current_medications   TEXT,
  emergency_flag        BOOLEAN NOT NULL DEFAULT false,
  emergency_reason      TEXT,
  summary_en            TEXT,
  status                TEXT NOT NULL DEFAULT 'intake_in_progress'
                         CHECK (status IN ('intake_in_progress', 'history_ready', 'confirmed', 'rejected')),
  doctor_id             UUID REFERENCES doctors(id) ON DELETE SET NULL,
  doctor_notes          TEXT,
  confirmed_at          TIMESTAMPTZ,
  severity_score        INTEGER,
  severity_reasoning    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_type    TEXT CHECK (document_type IN ('prescription', 'lab_report', 'discharge_summary', 'other')),
  file_url         TEXT,
  file_name        TEXT,
  parsed_text      TEXT,
  abnormal_values  JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_patient ON intake_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_doctor ON intake_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON medical_documents(patient_id);
