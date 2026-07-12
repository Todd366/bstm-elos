# Trial-to-Archetype Promotion Rule

Operational rule for when a completed trial in `02_trial_intelligence/` is allowed to create or reinforce an entry in `03_pattern_intelligence/`.

## Promotion Criteria
A trial promotes to (or reinforces) an archetype when ALL of the following are true:
1. `trial_outcome` is `Confirmed` or `Revised` (never `Inconclusive` — see Trial 004, which stayed out of archetype evidence for this reason).
2. The `actual_bottleneck` field matches an existing archetype name, OR the trial explicitly proposes a new one.
3. The trial's `## Interpretation` section states a generalizable mechanism (not just a business-specific fact).

## New Archetype Creation
A brand-new archetype file is created only when a Confirmed/Revised trial's `actual_bottleneck` does not match any existing archetype in `03_pattern_intelligence/`.

## Archetype Evolution Triggers (from README Section 4)
- **Expand** — new trial adds a characteristic not previously documented (update the archetype file's Evidence and Diagnostic Signature sections).
- **Merge** — two archetypes repeatedly show the same underlying cause across 3+ trials.
- **Split** — one archetype becomes too broad and contains distinguishable failure patterns (e.g. Agility Type splitting into a Liquidity-linked sub-type, flagged as a watch item after Trial 007's Agility/Liquidity intersection).
- **Historical** — no longer useful, preserved for learning, moved conceptually (not physically) — annotate in the file rather than deleting it.
- **Rejected** — evidence proves the classification inaccurate; move to a `rejected` note in the same file, do not delete.

## Automation Note
`scripts/compile_scorecard.py` currently scores trials, not archetype promotions. A `scripts/check_promotion_eligibility.py` script is a natural v1.1 addition once trial volume exceeds ~15 — flagged for the Change Request process, not built pre-emptively (per Non-Goals: no engineering ahead of evidence).
