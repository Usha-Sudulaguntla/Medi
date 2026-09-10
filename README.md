# MediKiosk — complete Base44 replacement (backend + frontend + database)

Your actual repo (`Usha-Sudulaguntla/MediKiosk`) with Base44 fully replaced:
**Postgres** (data), **JWT auth with email-OTP verification + Google OAuth**
(bcrypt-hashed passwords), **local disk storage** for uploads, and the
**Anthropic API called directly** (no Base44 proxy) for both AI features.
Every page and flow in your original app is implemented — nothing stubbed
out except one Base44-platform-only feature (see bottom).

This zip contains two things:
- `/` (this folder) — the Express + Postgres backend
- `/frontend` — your **entire original MediKiosk app**, with only the Base44
  plumbing swapped out. Every component, page, and piece of UI is untouched.

Both were installed, built, and smoke-tested end-to-end while I put this
together (registration → OTP → login → patient creation → auto-UHID →
admin-gated doctor management all verified against a real Postgres
instance) — this isn't just written, it's been run.

| Base44 piece | Replaced by |
|---|---|
| `base44.entities.Doctor/Patient/IntakeSession/MedicalDocument` | Postgres tables + `/api/doctors`, `/api/patients`, `/api/intake-sessions`, `/api/medical-documents` |
| `base44.auth.*` (incl. OTP register/verify, Google login, password reset) | `/api/auth/*` — see below |
| `base44.integrations.Core.UploadFile` | `/api/upload` (multer, local disk — swap for S3 in prod) |
| `base44/functions/clinicalSummary` (`Core.InvokeLLM`) | `/api/ai/clinical-summary` — real Claude call, tool-forced JSON |
| `base44/functions/scanDocument` (`Core.ExtractDataFromUploadedFile`) | `/api/ai/scan-document` — Claude reads the uploaded image/PDF directly |

## 1. Database

Recommended: **Supabase** (free tier, managed, backups included — good fit
since this is patient data you'll want to actually keep safe).

1. [supabase.com](https://supabase.com) → New Project → set a DB password, pick a nearby region
2. **Project Settings → Database → Connection string** → copy the **Transaction pooler** URI (port 6543)
3. **SQL Editor → New query** → paste in `db/schema.sql` → Run (creates all 8 tables)

Put the connection string in `.env` (step 2 below) as `DATABASE_URL`, with
`DATABASE_SSL=true`.

(Local Postgres/Docker also works fine for dev — see `.env.example` for the
local connection string shape; run `npm run db:init` instead of the SQL
Editor step.)

## 2. Backend

```bash
npm install
cp .env.example .env
# fill in: DATABASE_URL, JWT_SECRET (any long random string),
#          ANTHROPIC_API_KEY, FRONTEND_URL
npm run dev
```

Runs on `PORT` (default 8787). Check `curl http://localhost:8787/api/health`.

**Create your first admin** (needed for the Manage Doctors page — self-signup
never grants admin):
```bash
npm run create-admin -- admin@yourhospital.com "a-strong-password"
```

**Email (OTP codes + password reset links)** — optional for local dev. If
`SMTP_HOST` is left blank in `.env`, codes/links are printed to the server
console instead of emailed, so registration works immediately without any
setup. Fill in `SMTP_*` (e.g. an SES/Postmark/Gmail-app-password SMTP
relay) when you're ready to actually send email.

**Google OAuth** ("Continue with Google") — optional. Leave `GOOGLE_CLIENT_ID`
blank to disable it (email/password still works fully). To enable: create
credentials at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials),
set the authorized redirect URI to match `GOOGLE_REDIRECT_URI` in `.env`.

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_BASE_URL, default http://localhost:8787/api is fine for local dev
npm run dev              # http://localhost:5173
```

Nothing else to change — `src/api/base44Client.js` and `src/lib/app-params.js`
were rewritten **in place** (same file paths, same exports) so none of your
~19 components needed their imports touched. I ran `npm run build` and
`npm run lint` on the real tree to confirm it compiles clean (one pre-existing
unused-import lint warning in `ManageDoctors.jsx` — that was already in your
original code, unrelated to this migration).

## 4. What's fully implemented (verified, not stubbed)

- **Patient self-registration** with email OTP verification (`PatientAuth.jsx`, `Register.jsx`)
- **Doctor self-signup**, gated on the Doctor table being pre-populated by an admin (`DoctorSignUp.jsx`) — the pre-auth gate check works via a public-read exception on `GET /api/doctors`
- **Google OAuth login** for both patient and doctor entry points (`Login.jsx`, `Register.jsx`)
- **Forgot / reset password** via emailed link (`ForgotPassword.jsx`, `ResetPassword.jsx`)
- **Admin-only doctor management** (`ManageDoctors.jsx`) — enforced server-side, not just hidden in the UI
- **Patient kiosk intake flow** end-to-end, including the real Claude call that translates + structures the intake into an English clinical note and flags emergencies (`PatientKiosk.jsx`)
- **Document scan/OCR** — prescriptions/lab reports sent directly to Claude as image/PDF input, structured extraction incl. abnormal lab value flagging (`DocumentScan.jsx`)
- **Doctor queue dashboard** with live-ish updates (5s polling in place of Base44's realtime `subscribe()`) (`QueueDashboard.jsx`)
- **Physician dashboard** — review/confirm/reject sessions (`PhysicianDashboard.jsx`)
- `created_date` field naming, `sort`/`limit` query params, and auto-generated UHIDs (`MK-2026-00001`, ...) all match your original app's expectations exactly

## 5. Not migrated

`src/pages/OAuthConsent.jsx` — a Base44-platform feature that lets AI
clients (Claude, Cursor, etc.) connect to your app as an MCP server through
Base44's own hosted OAuth infrastructure. It calls Base44 platform routes
(`/api/apps/{appId}/mcp/...`) that only exist on Base44's servers — there's
no self-hosted equivalent to point it at. Building one is a genuinely
separate project (an OAuth 2.0 authorization server + MCP server), unrelated
to the kiosk's clinical workflow, so I didn't fake it. The page is still in
the tree; it just won't function until/unless you build that server
yourself. Everything else in your app works.

## 6. Production notes

- Swap `routes/upload.js`'s disk storage for S3/GCS before deploying
  anywhere with an ephemeral filesystem (Render, Railway, Heroku all wipe
  local disk on redeploy).
- This is patient data — put the API behind HTTPS and use a strong,
  unique `JWT_SECRET`.
- Current write permissions: `doctors` is admin-only (enforced); patients,
  intake-sessions, and medical-documents are any-authenticated-user
  (matches what your original components assume — tighten with
  `requireRole('doctor','admin')` in `server.js` if you want stricter
  server-side enforcement before real patient data flows through this).
- `ANTHROPIC_MODEL` defaults to `claude-sonnet-5` — override in `.env` for a
  different model.
