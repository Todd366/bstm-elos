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
