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

## Phase 4 — Outcome/learning calibration loop + CI health gate

- `api/outcomes.js` (POST) — records the ACTUAL result of an implemented
  recommendation (`positive`/`negative`/`neutral`), distinct from mere human
  acceptance (`api/feedback.js`). Writes to `elos_outcomes` +
  `elos_learning_records`, links to the business's latest recommendation,
  and emits a `RECOMMENDATION_OUTCOME_RECORDED` event.
- `intelligence/learning.js` — added `recordOutcome()` /
  `calculateOutcomeSuccessRate()`.
- `intelligence/confidence.js` — now takes a second, more heavily-weighted
  signal (outcome success rate, weight 0.35 vs acceptance's 0.2). This is
  what actually closes the ELOS loop per the spec's System 14 (Learning
  Engine): confidence now moves based on whether recommendations were
  proven right in reality, not just whether a human liked them.
- `api/receive-audit.js` now computes both acceptance AND outcome rates per
  department and feeds both into `calculateConfidence()`.
- `api/learning-summary.js` (GET) now reports both `acceptanceRate` and
  `outcomeSuccessRate` per department.
- `08_sentinel_audit/ci-gate.js` + `.github/workflows/sentinel-audit.yml` —
  every push/PR to master now runs the Sentinel Audit and fails CI if the
  ecosystem health score drops below 60. Zero npm dependencies, pure Node.

## How to record an outcome (example)
```
POST /api/outcomes
{
  "businessId": "noemi-s-jewelry-store-field-audit",
  "departmentId": 12,
  "result": "positive",
  "expected": "increase in profile views",
  "actual": "45 unique views in 48hrs",
  "notes": "Digital catalog listing went live"
}
```

## Phase 5 — Write-endpoint auth, Command Center dashboard, data hygiene

- `api/_lib/auth.js` — shared-secret gate (`x-elos-api-key` header) on the
  four true server-to-server write endpoints: `receive-audit.js`,
  `events.js`, `outcomes.js`, `feedback.js`. **Fails open with a console
  warning until `ELOS_INGEST_KEY` is set** in Vercel, so nothing breaks
  before the producer apps are updated to send the header.
  `save-trial.js` was deliberately left unauthenticated — it's called by
  ELOS's own public PWA (`trialForm.js`), and a "secret" shipped in
  client-side JS isn't a secret.
- New **Command Center** page (`views.js: renderIntelligence`, route
  `#/intelligence`) — the first UI in ELOS that reads live from Supabase via
  `/api/ecosystem-intelligence`, `/api/learning-summary`, `/api/list-events`.
  Shows businesses + archetypes, department demand, acceptance-vs-outcome
  learning table, and a recent-events feed. Added to the sidenav.
- Data hygiene: deleted 4 leftover `"Test Curl Business"` junk observations
  from `elos_observations` (early curl testing, not real data).

## To fully enable write-endpoint auth (do this when ready — not urgent)
1. Set `ELOS_INGEST_KEY` in Vercel (Production + Preview) to:
   `s8eNcwIWyjDDtqJV5x0TSoJAzUtIhEETUOFk6KCkeSw`
   (or generate your own — any long random string works)
2. Update whichever app(s) call `receive-audit`/`events`/`outcomes`/`feedback`
   (business-health-audit, cablink, flowledger, marketplace) to send header:
   `x-elos-api-key: s8eNcwIWyjDDtqJV5x0TSoJAzUtIhEETUOFk6KCkeSw`
3. Until step 1 is done, these endpoints remain open (by design, logged).

## Also check in Vercel (cleanup, low priority)
- `ELOS_API_URL` — appears unused by anything in this repo now; confirm no
  other app depends on it before removing.
- `GITHUB_REPO` — leftover from the pre-Supabase era, safe to remove if
  still present (GITHUB_TOKEN was already removed).

## Phase 5.1 — bugfix: archetype missing from ecosystem-intelligence + stale pattern scan

Found while verifying Phase 5 in production:
- `api/ecosystem-intelligence.js` never included `archetype`/`archetypeConfidence`
  in its `businesses` array, even though the Command Center dashboard reads
  `b.archetype`. Fixed — now included.
- `elos_patterns.auto-latest-scan` had never been written because no live
  `/api/receive-audit` call has run since the Supabase migration (all data
  since has come in via direct SQL migration, not the API). This made
  `topDepartmentDemand` and `detectedPatterns` show empty on the dashboard
  despite 11 real businesses with clear demand. Backfilled directly in
  Supabase using the same computation `detectPatterns()` performs, so the
  dashboard isn't empty on first load. It will self-correct going forward:
  the next real `/api/receive-audit` call recomputes and overwrites this row.

## Phase 6 — Patterns/principles are now engine-generated, not hand-authored

You were right to flag this: `renderPatterns`/`renderPrinciples` were literally
`prompt()` dialogs writing free-typed text into local IndexedDB — completely
disconnected from what the engine actually detects. Fixed at the root:

- `intelligence/patternPromotion.js` — turns `detectPatterns()` output into
  individually addressable rows in `elos_patterns`, each with a
  system-generated ID (`AUTO-ECO-<weakness>` / `AUTO-IND-<industry>-<weakness>`).
  Auto-promotes CANDIDATE → ACTIVE once `percentage >= 60` AND `sampleSize >= 5`;
  auto-retires ACTIVE → RETIRED if evidence later drops below 30%. Wired into
  `api/receive-audit.js` — runs on every audit, no human involved.
- `api/outcomes.js` now auto-drafts an EXPERIMENTAL principle
  (`AUTO-PRIN-<archetype>-dept<N>`) whenever the same archetype+department
  combination produces 2+ negative outcomes — assembled from the actual
  recorded evidence, flagged for human review, never duplicated.
- `api/patterns.js` + `api/principles.js` (GET, read-only) — the actual "read
  what ELOS is saying" surface.
- `views.js`: `renderPatterns`/`renderPrinciples` rewritten to be read-only,
  fetching live from those two endpoints. The `➕ New Pattern`/`➕ New
  Principle` buttons and their `prompt()`-based editors are gone entirely —
  there is no UI path left to hand-author one.
- Dashboard's "Active Archetypes"/"Active Principles" cards now count live
  ACTIVE rows from the API instead of the (now permanently empty) local
  IndexedDB stores.
- Backfilled 4 `CANDIDATE`-status ecosystem patterns directly in Supabase to
  match what the code would produce (none cross the 60% promotion threshold
  yet with only 11 audited businesses — that's accurate, not a bug).

**Not touched (deliberately):** the offline in-app Sentinel self-check
(`#/sentinel`, distinct from the CI Sentinel Audit) still references the now
permanently-empty local `patterns`/`principles` IndexedDB stores for a
completeness score. It defaults to 100% when those arrays are empty, which is
harmless, but is now vestigial. Low priority — flag if you want it removed.

**The 03_pattern_intelligence / 04_organizational_principles markdown files**
in the repo remain as-is — they're the original human-reviewed documentation
of how the archetype system was discovered from the first 6 trials, migrated
into Supabase in Phase 1 with real trial evidence behind them. That's
different from ongoing pattern/principle generation, which is now 100%
automatic going forward.

## Phase 7 — bugfix: Dashboard/Trial Archive showed 0 trials despite 6 confirmed

Root cause: `renderDashboard`/`renderTrialsList`/`renderTrialViewer` only ever
read the LOCAL device's IndexedDB `trials` store. The 6 original confirmed
field trials (BSTM-100T-001..006) were migrated straight into Supabase
`elos_trials` in Phase 1 and never existed in any device's local IndexedDB —
so any fresh device (or after a data reset) correctly showed 0, because
locally there genuinely was nothing. Same category of bug as the
patterns/principles one you caught — local-only storage presented as if it
were the full picture.

Fixed:
- `api/trials.js` (GET, read-only) — lists all trials from `elos_trials`.
- `renderTrialsList` now merges local drafts with live Supabase trials
  (dedup by `trial_id`, local device copy wins if both exist). Remote-only
  trials show without Edit/Delete (they're the confirmed record, not this
  device's draft) and route to a new read-only viewer.
- `renderRemoteTrialViewer` (new) + route `#/trials/remote/:trial_id` — shows
  the confirmed trial's field record for trials that live only in ELOS.
- `renderDashboard`'s Total/Submitted/Draft counts now reflect local drafts +
  live Supabase submissions combined, not local-only.

**Not fully fixed (scoped out, documented honestly instead):** the Scorecard
page's Learning Yield / Drift Velocity / Predictive Accuracy / Uncertainty
Rate / Error Digestion Speed still compute from local trials only. The 6
original trials' structured scoring fields (capability outcomes, assumption
confidence deltas) were captured as prose in their original `.md` files, not
migrated into `elos_trials.data` as structured JSON — so there's nothing
structured to merge in yet. Scorecard's subtitle now says so explicitly
instead of silently under-reporting. If you want this fully fixed, the 6
original trial markdown files need their scoring fields re-parsed into
`elos_trials.data` — flag it and I'll do that pass.
