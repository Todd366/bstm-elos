# BSTM ELOS — Institutional Learning Metrics

BSTM does not only measure activity. It measures learning quality.

## Belief Drift Velocity
Did evidence change our thinking? Average absolute change between Initial Confidence and Final Confidence across all assumptions in all trials.

## Predictive Accuracy
Did our prediction correctly identify the real bottleneck? % of trials where `predicted_bottleneck == actual_bottleneck`.

## Learning Yield
Did failure create permanent improvement? `(New Principles + Revised Principles) / Documented Failures`

## Uncertainty Rate
Can BSTM admit when evidence is insufficient? % of trials marked Inconclusive. A healthy system does not pretend certainty — see Trial 004.

## Error Digestion Speed
How quickly does failure become improvement? Measured as days between a trial's "Fracture" being logged and a resulting principle being formalized. Trial 006 → BSTM-PRIN-008 took 0 days (same-cycle).

Run `python3 scripts/compile_scorecard.py` from the repo root to regenerate `04_organizational_principles/learning_scorecard.md` from live trial data at any time.
