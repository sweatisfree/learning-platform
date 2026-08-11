# Thríamvos — System Architecture & Coding Standards

## Project Overview
Thríamvos is a training readiness and recovery platform for athletes and active-aging adults.
It aggregates athletic workload from Strava to compute Acute-to-Chronic Workload Ratio (ACWR),
neuromuscular strain (sRPE), TRIMP, and recovery scores.

## Architecture Guidelines
- Framework: Next.js (App Router), React, TypeScript, Tailwind CSS. Deploys to Vercel as a normal web app — no static export, no native wrapper.
- Integrations: Strava API (OAuth2, standard web redirect flow), Supabase for auth and data storage.
- Strava OAuth: the `client_secret` lives server-side only, in the `/app/api/strava/exchange` Route Handler (`lib/config/server-env.ts`, guarded by the `server-only` package). Never expose it to the client. `NEXT_PUBLIC_STRAVA_CLIENT_ID` is safe to expose; `STRAVA_CLIENT_SECRET` is not.
- Calculations: EWMA ACWR, TRIMP for cardio, Session RPE (sRPE) for strength/isometric work — live in decoupled calculation engines under `/lib/engine/`, as pure functions. They're source-agnostic (plain numeric inputs), so they don't care whether load/heart-rate data comes from Strava or manual entry.

## Data Privacy
All biometric and Strava data stored in Supabase is encrypted at rest, isolated via Row Level Security, and never sold or shared with third parties. Concretely:
- Every table holding biometric or Strava data (heart rate, HRV, activities, tokens, computed scores) MUST have RLS enabled with policies scoped to `auth.uid()` — no table storing user data ships without RLS.
- No service-role key or RLS bypass in client-reachable code paths. Service-role access, if ever needed, stays server-side and scoped to a specific job, not general reads.
- No third-party analytics, tracking, or ad SDKs that transmit user data off our infrastructure.
- No selling or sharing user data with third parties, in any form (aggregated, anonymized, or raw).

## Commands
- Build: `npm run build`
- Dev Server: `npm run dev`
- Test: `npm run test`
- Lint: `npm run lint`

## Code Style Rules
- Strict TypeScript types for all data schemas (Strava, UserProfiles) — see `/lib/strava/types.ts`, `/lib/types/`.
- Use functional React components with hooks.
- Keep business logic inside decoupled calculation engines (`/lib/engine/`).

## Git workflow
- Commit and push directly to `main` when the user asks for a commit/push. Do not create feature branches or pull requests unless explicitly requested.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
