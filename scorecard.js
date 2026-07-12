/* scorecard.js — computes ELOS learning metrics from stored trials.
   Formulas are defined explicitly here and can be tuned in one place. */

function computeScorecard(trials) {
  const submitted = trials.filter(t => t.status === 'submitted');
  const total = submitted.length;

  if (total === 0) {
    return {
      total: 0, learningYield: 0, driftVelocity: 0,
      predictiveAccuracy: 0, uncertaintyRate: 0, errorDigestionSpeed: 0,
    };
  }

  // Predictive Accuracy: % where predicted bottleneck matches actual
  const matched = submitted.filter(t =>
    t.predicted_bottleneck && t.actual_bottleneck &&
    t.predicted_bottleneck.trim().toLowerCase() === t.actual_bottleneck.trim().toLowerCase()
  ).length;
  const withBoth = submitted.filter(t => t.predicted_bottleneck && t.actual_bottleneck).length;
  const predictiveAccuracy = withBoth ? (matched / withBoth) * 100 : 0;

  // Belief Drift Velocity: average |initial - final| confidence across all assumptions
  let driftSum = 0, driftCount = 0;
  submitted.forEach(t => {
    (t.confidence_updates || []).forEach(c => {
      if (typeof c.initial === 'number' || typeof c.final === 'number') {
        driftSum += Math.abs((Number(c.final) || 0) - (Number(c.initial) || 0));
        driftCount++;
      }
    });
  });
  const driftVelocity = driftCount ? driftSum / driftCount : 0;

  // Learning Yield: average number of capability outcomes captured per trial, as a %
  // of the maximum possible outcomes (7), averaged across all submitted trials.
  let capSum = 0;
  submitted.forEach(t => { capSum += (t.capability_check || []).length; });
  const learningYield = total ? (capSum / total / CAPABILITY_OPTIONS.length) * 100 : 0;

  // Uncertainty Rate: % of trials marked Inconclusive
  const inconclusive = submitted.filter(t => t.trial_outcome === 'Inconclusive').length;
  const uncertaintyRate = total ? (inconclusive / total) * 100 : 0;

  // Error Digestion Speed: % of trials that needed digestion (Inconclusive/Rejected/Declined)
  // that actually have an Error Digestion entry filled in.
  const needingDigestion = submitted.filter(t =>
    ['Inconclusive', 'Rejected', 'Declined'].includes(t.trial_outcome));
  const digested = needingDigestion.filter(t => (t.error_digestion || '').trim().length > 0);
  const errorDigestionSpeed = needingDigestion.length ? (digested.length / needingDigestion.length) * 100 : 100;

  return {
    total, learningYield, driftVelocity, predictiveAccuracy, uncertaintyRate, errorDigestionSpeed,
  };
}
