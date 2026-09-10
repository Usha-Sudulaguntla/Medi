# MediKiosk (frontend)

Self-hosted version — Base44 removed. This is a plain Vite + React app that
talks to the Express/Postgres backend in `../` (the parent `medikiosk-backend`
folder).

## Run locally

```bash
npm install
cp .env.example .env      # set VITE_API_BASE_URL if the backend isn't on :8787
npm run dev                # http://localhost:5173
```

Make sure the backend (`../server.js`) is running first — see the top-level
`README.md` for backend setup (database, `.env`, `npm run dev`).

## What changed from the Base44 version

- `src/api/base44Client.js` — same file, same `base44` export, but now talks
  to the Express API instead of Base44. No other file needed to change its
  imports.
- `src/lib/app-params.js` — simplified to read the JWT from `localStorage`
  directly instead of `@base44/sdk`.
- `vite.config.js` — `@base44/vite-plugin` removed.
- `package.json` — `@base44/sdk` and `@base44/vite-plugin` removed.
- `base44/` (entity/function definitions used by the Base44 CLI) removed —
  those now live as real code in the backend (`../db/schema.sql`,
  `../routes/ai.js`).

See the top-level `README.md` for the full list of what carried over 1:1 vs.
what needed backend work (OTP email verification, Google OAuth, password
reset, the doctor-signup gate, etc.) — all of it is implemented, not stubbed.

## Not migrated

`src/pages/OAuthConsent.jsx` is a Base44-platform feature (lets AI clients
like Claude/Cursor connect to your app as an MCP server via Base44's hosted
OAuth infrastructure). It calls Base44 platform routes
(`/api/apps/{appId}/mcp/...`) that only exist on Base44's servers — building
an equivalent is a separate OAuth-authorization-server project, unrelated to
the kiosk's clinical workflow, so it wasn't reimplemented. The page is still
in the tree; it just won't work until/unless you build that server yourself.
