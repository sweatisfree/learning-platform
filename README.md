# Thríamvos

A training readiness and recovery platform for athletes and active-aging adults. Aggregates Strava workload data to compute ACWR, TRIMP, and sRPE.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, deployed to Vercel as a normal web app.
- Supabase for auth and data storage.
- Strava API via standard OAuth2 web redirect — the `client_secret` is held server-side in a Next.js Route Handler (`/app/api/strava/exchange`), never in the client bundle.
- Vitest for the calculation engines under `/lib/engine/`.

See [CLAUDE.md](./CLAUDE.md) for the full architecture and coding standards.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/anon key
npm run dev
```

## Status

Phase 1 scaffold: auth flow, typed schemas, and the EWMA/ACWR/TRIMP/sRPE calculation engines are implemented and tested. Strava OAuth is wired end-to-end (redirect, callback, session-verified exchange route) but the actual token exchange is a TODO — see `/app/api/strava/exchange/route.ts` — since it needs a registered Strava API app's `client_id`/`client_secret`. The recovery-score weighting is also not yet implemented — see `/lib/engine/recovery-score.ts`.
