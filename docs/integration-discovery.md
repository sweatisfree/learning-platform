# Integration discovery (Phase 0)

Written 2026-11-17 against the codebase at commit `6e87047`, in response to the
wearables integration brief. That brief was written from the public website
only. This file reports what the code actually does and corrects the brief
where the two disagree.

**Read the five blocking findings before planning any phase.** Three of them
remove work the brief assumes is a small addition, and one of them inverts the
recommended provider order.

---

## 1. Blocking findings

### 1.1 There is no activities table. Activities are never stored.

`lib/strava/client.ts` calls Strava on every dashboard load with a rolling
42-day window, feeds the result straight into the engine, and discards it. No
migration in `supabase/migrations/` creates an activities table, and the privacy
policy states the behaviour deliberately: *"Activities themselves are fetched
live and are not stored in our database."*

This removes the foundation several parts of the brief stand on:

| Brief section | Status |
|---|---|
| §5.2 "**activities**: add these columns" | Nothing to add columns to. The table must be built. |
| §5.4 Activity de-duplication | Cannot run. Dedupe compares stored records; none persist between page loads. |
| §5.5 Backfill | Nowhere to backfill into. |
| §6.1 Hevy as the easiest first provider | Hevy is a pull API producing workouts. Without persistence its data has nowhere to live. |

Building activity persistence is a Phase 1 task that does not appear in the
brief at all. It also changes the privacy policy, which currently promises the
opposite, and that promise is a selling point rather than an oversight. Treat
"start storing activities" as a product decision for the owner, not a schema
chore.

### 1.2 Scoring runs in the browser

`app/dashboard/page.tsx` and `app/settings/page.tsx` both start with
`"use client"` and call `computeAcuteChronicLoad`, `computeAutonomicRecoveryIndex`
and `computeRecoveryScore` directly. There is no server-side scoring path and no
table of computed scores.

Consequences for the plan:

- A multi-source pipeline either moves scoring server-side, or ships every raw
  signal from every connected provider to the browser on each page load.
- Source-aware baselines (§5.3) keyed on `(user, signal, source, method)` are
  far more data to send to a client than today's flat reading list.
- The §10 regression test ("existing users get identical scores before and
  after") has nothing to snapshot against. No score is ever persisted, so
  fixture users must be constructed first for that test to mean anything.

Moving scoring to the server is the larger of the two architectural changes in
this document. It is not optional if more than two or three sources land.

### 1.3 No job runner of any kind

No `vercel.json`, no cron configuration, no queue, no scheduled function.
Confirmed by search across the repo. Every sync model in the brief — backfill
jobs (§5.5), polling for pull-only providers (§5.6), retry with backoff — is new
infrastructure rather than new code on existing infrastructure.

### 1.4 Tokens are not encrypted at application level

Ground rule 5 says OAuth tokens are "encrypted at rest". In the application
sense this is not currently true, and there is no encryption helper anywhere in
`lib/`.

What actually protects them, in `supabase/migrations/0002_strava_connections.sql`:

- `access_token` and `refresh_token` are plain `text` columns.
- The table has RLS **enabled with zero policies**, which in Postgres means
  anon and authenticated roles get no rows on any operation. Only the
  service-role key, which bypasses RLS, can read them.
- Supabase encrypts the underlying disk, so "encrypted at rest" is true of the
  storage layer and false of the column.

The existing comment in that migration argues the case deliberately and warns
against "fixing" it by adding an owner policy. Either keep that model and
restate ground rule 5 to describe it accurately, or build a column-encryption
helper before the second provider's tokens land. Do not let the brief's wording
imply the work is already done.

### 1.5 `toAutonomicReadings` double-counts days

`lib/health/readings.ts` drops the `source` field and returns every row:

```ts
export function toAutonomicReadings(stored: readonly StoredHealthReading[]): AutonomicReading[] {
  return stored.filter(hasAnySignal).map((reading) => ({ ... }));   // source discarded
}
```

`health_readings` is unique on `(user_id, recorded_date, source)`, so one date
can already hold a `webhook` row **and** a `manual` row. Both reach
`computeAutonomicBaseline` as separate readings, so that day is weighted twice
in the user's own baseline.

This is a live defect with the two sources that exist today. With six it becomes
the normal case. It is also the natural place to implement §5.3's "use only the
primary source for each signal", so the fix and the feature are the same work.

The brief does not mention it. It blocks everything else.

---

## 2. Corrections to the brief's sections 2 and 3

### Confirmed as written

- Web app on Next.js, deployed to Vercel. **Next.js 16.3.0, App Router,
  Turbopack; React 19.2.8.** API routes are App Router handlers at
  `app/api/*/route.ts`.
- Readiness = 60% autonomic + 40% load, renormalised when one half is missing,
  null when both are. `lib/engine/recovery-score.ts`: `AUTONOMIC_WEIGHT = 0.6`,
  `LOAD_WEIGHT = 0.4`.
- Load component full at ACWR ≤ 1.30, zero at 2.00. `LOAD_NEUTRAL_CEILING = 1.3`,
  `LOAD_ZERO_FLOOR = 2.0`.
- Seven readings minimum per signal. `DEFAULT_MIN_READINGS_PER_METRIC = 7`.
- Formula version `1.0.0`, with a comment requiring `/transparency` to be
  updated in the same commit as any constant change.
- Health Auto Export webhook with an `X-Health-Token` header, storing daily
  values for RHR, HRV, sleep and respiratory rate; everything else ignored.
- The six-week window is real: `fetchRecentActivities` defaults to
  `afterDaysAgo = 42`.

### Corrections

**Database.** Supabase Postgres with Supabase Auth. **No ORM** — `supabase-js`
is called directly. **No migration tooling**: `supabase/migrations/*.sql` are
hand-written files applied by pasting into the Supabase SQL Editor, as the
header of `0001_health_data.sql` states. Every schema change in this plan is a
manual step the owner performs, so migrations must be ordered, idempotent, and
accompanied by instructions.

**Current schema** is five tables, not the set the brief assumes:
`health_webhook_tokens`, `health_readings`, `strava_connections`,
`user_profiles`, `subscriptions`. There is no activities table, no baselines
table and no scores table. Baselines are recomputed from raw readings on every
render.

**`health_readings` already has a `source` column**, so §5.2's `daily_signals`
is a redesign of something that partly exists rather than a greenfield table.
Current shape:

```sql
source text not null check (source in ('webhook', 'manual')),
unique (user_id, recorded_date, source)
```

It is one row per date per source with four nullable metric columns, where
`daily_signals` proposes one row per signal. Decide explicitly whether to
migrate to the long format or widen the existing wide format; both work, and
the wide one is less disruptive to the engine.

**The HRV method is not recorded.** The column is `hrv numeric` with a code
comment reading *"Apple HealthKit's SDNN metric, not rMSSD."* Ground rule 3
requires the method in the data, not in a comment. Adding the column is easy;
the migration must backfill every existing row as `sdnn` from `apple_hae`, which
matches §5.3's migration note.

**Strava is pull-only, not a webhook template.** `app/api/strava/activities/route.ts`
fetches on request. Strava's webhook API is not implemented. The brief suggests
using Strava "as the template for new OAuth providers" — correct for the OAuth
and refresh flow, which is genuinely reusable, but there is no push-delivery
template in the repo except the Health Auto Export token endpoint.

**A third activity path exists** that the brief does not know about:
`lib/activities/parseWorkoutFile.ts` parses uploaded GPX/TCX files, exercised by
an internal harness at `/dev/workouts`. `ActivitySource` is already
`"strava" | "file" | "manual"`, so the `Activity` type is a partial foundation
for the adapter model.

---

## 3. What is genuinely reusable

Not everything is a gap. Three pieces are solid and should be the spine of the
adapter work.

**OAuth with token rotation.** `lib/strava/getValidAccessToken.ts` handles
expiry buffering and the race where a rotated refresh token is spent by a
concurrent request before this call uses it. WHOOP's rotating refresh tokens
(§6.2) have exactly this hazard. Generalise this function rather than rewriting
it per provider.

**The service-role boundary.** `lib/supabase/service-role.ts` is the single
place that bypasses RLS, and `lib/config/server-env.ts` is guarded by the
`server-only` package so secrets cannot be imported into client code. New
provider credentials belong behind the same boundary.

**Engine purity.** `lib/engine/` functions take plain numbers and return plain
numbers, with no knowledge of Supabase or Strava. 84 tests across 10 files, with
good coverage of ACWR, EWMA, TRIMP, sRPE and the readiness score. Adding sources
should require no engine changes at all, which is what makes the brief's core
claim — that the scoring model survives — correct.

One caveat on test coverage: `parseHealthAutoExportPayload` has tests, but its
own comments say the payload format was written from vendor documentation and
never verified against a live payload, specifically flagging the sleep field
choice as a guess. **Before building a second ingestion path, confirm a real
reading has ever arrived through the first one** (Settings → Stored readings, a
row with `source: webhook`). If none has, the existing path may never have
worked, which changes priority.

---

## 4. Revised order of work

The brief's Phase 1 bundles the adapter refactor, the normalized schema,
source-aware baselines, the dedupe engine and Hevy. That is too much for one
phase, and three of the five depend on persistence that does not exist.

### Phase 1 — Foundations (new; replaces the brief's Phase 1)

1. Fix the double-count in `toAutonomicReadings`, with per-metric source
   preference. Blocks everything.
2. Add the HRV `method` column and backfill existing rows as `apple_hae` /
   `sdnn`. Widen the `source` check constraint.
3. Decide the activities question with the owner: persist them, with the privacy
   policy updated to match, or accept that dedupe and backfill are off the table.
4. Decide the server-side scoring question. The answer sets the ceiling on how
   many sources are practical.

### Phase 2 — Adapter interface

Refactor Strava and Health Auto Export behind the common interface with no
behaviour change, guarded by a snapshot test on fixture users. Generalise
`strava_connections` into one provider-keyed connections table.

### Phase 3 — WHOOP and Oura, **before Hevy**

This inverts the brief's order, for a concrete reason. WHOOP and Oura produce
**daily signals**, which `health_readings` already stores. Hevy produces
**workouts**, which nothing stores. Against the current schema, Hevy is the
hardest of the three to land, not the easiest — its difficulty is entirely in
finding 1.1, which the brief could not see from the website.

Hevy's API-key auth is genuinely simpler than OAuth. That advantage is real and
it is smaller than the cost of building activity persistence to receive it.

### Phase 4 — Hevy and the dedupe engine

Both become possible once activities persist. Dedupe is only meaningful when a
second activity source exists, so it belongs here rather than in Phase 1.

### Phase 5 — Garmin and Google Health

Unchanged from the brief. Gated on approvals, not on engineering.

### Non-code actions — start now, unchanged

The brief is right that these are the long pole and should run in parallel with
every phase above: Garmin Developer Program application, Google Cloud project
and Restricted-scope review, WHOOP and Oura developer registrations plus Oura's
approval beyond 10 users, and the privacy policy rewrite.

Note that the privacy policy update is no longer only a compliance task. If
finding 1.1 is resolved by persisting activities, the policy's current claim
that activities are not stored becomes false and must change before the code
ships.

---

## 5. Open questions for the owner

1. **Store activities?** Required for dedupe, backfill, Hevy and the 12-month
   history roadmap item. Costs the "we don't store your activities" promise.
2. **Move scoring to the server?** Required beyond a handful of sources. Larger
   change than any single provider.
3. **Encrypt tokens at the column level, or document the service-role model as
   the control?** Both are defensible; the brief currently assumes work that
   does not exist.
4. **Has the Health Auto Export path ever delivered a real reading?** If not,
   fix or retire it before adding a second ingestion path modelled on it.
5. **Long or wide storage for daily signals?** `health_readings` is wide today
   and the engine expects that shape.
