# ELOS → Supabase migration (Phase 1)

## What changed
- All persistence moved off the GitHub Contents API (`api/_lib/github-commit.js`,
  `api/_lib/github-read.js` — deleted) onto Postgres via Supabase project
  `jeyneeetujvudwyovdzd` (the shared BSTM project — same one used by the
  Ecosystem HQ Evidence Vault).
- New tables (all prefixed `elos_` to avoid collision with other BSTM apps in
  the same project): `elos_departments`, `elos_rooms`, `elos_businesses`,
  `elos_trials`, `elos_patterns`, `elos_principles`, `elos_recommendations`,
  `elos_department_matches`, `elos_observations`, `elos_events`,
  `elos_insights`, `elos_outcomes`, `elos_learning_records`,
  `elos_sentinel_audits`.
- All existing repo data (30 departments, 6 businesses, 6 trials, 5 patterns,
  2 principles, 6 recommendations, 6 dept-matches, 8 observations, 3 sentinel
  audit runs) has already been migrated into these tables.
- `api/_lib/supabase.js` is the new data-access layer. Every `api/*.js`
  endpoint now reads/writes Postgres instead of committing JSON files to
  GitHub — same request/response shape, so the front-end (`trialForm.js`)
  needed zero changes.
- `08_sentinel_audit/historyWriter.js` still writes local history JSON
  (unchanged, Termux-safe) and now also best-effort mirrors each audit run
  into `elos_sentinel_audits` if Supabase env vars are present.

## Required Vercel environment variables (Production + Preview)
- `SUPABASE_URL` = `https://jeyneeetujvudwyovdzd.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (service role key from Supabase dashboard →
  Project Settings → API — never expose this in client-side code, it is only
  read inside `api/*.js` serverless functions)

## Required Termux/local environment variables (optional, for sentinel audit mirroring)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — export these before running
  `node 08_sentinel_audit/audit.js` if you want audit runs mirrored centrally.
  Safe to omit; local file history always works regardless.

## Old GitHub-based env vars (no longer used, safe to remove from Vercel)
- `GITHUB_TOKEN`, `GITHUB_REPO`

## Phase 3 — Archetype engine + generic event ingestion

- `intelligence/archetypeEngine.js` — classifies every audited business into one
  of the 4 field-confirmed archetypes (Exposure / Agility / Multi-System /
  Liquidity) or Unclassified, using the same signatures documented in
  `03_pattern_intelligence/`. Wired into `api/receive-audit.js` right after
  profile build.
- **BSTM-PRIN-008 guardrail is now enforced in code**, not just documented:
  `applyArchetypeGuardrail()` suppresses Social Media (11) / Digital Marketing
  (12) recommendations and boosts Finance & Accounting (17) for any business
  classified as Liquidity type.
- `api/events.js` (POST) + `api/list-events.js` (GET) — generic ELOS event
  ingestion per the spec's Standard Event Object. Any BSTM app (CabLink,
  FlowLedger, Marketplace, BSTM-X, THoBoCoin) can now POST events here instead
  of needing a bespoke endpoint. Writes to `elos_events`.
- `receive-audit.js` now also emits a `BUSINESS_HEALTH_AUDIT_PROCESSED` event
  into `elos_events` on every run — this is the first real usage of the event
  bus and the foundation for Phase 4 (outcome/learning loop).
- All 11 existing businesses backfilled with archetype classification directly
  in Supabase (6 use ground-truth archetypes from their confirmed field trials,
  5 use live classifier output).

## Next (Phase 4, not yet built)
- `api/outcomes.js` — record actual vs expected outcome per recommendation,
  feed into `elos_learning_records` and confidence calibration.
- Command Center dashboard reading live from `elos_events` / `elos_insights`.
