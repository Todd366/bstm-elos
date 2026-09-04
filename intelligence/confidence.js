function calculateConfidence(profile, patternCount, departmentAcceptanceRates, departmentOutcomeRates) {
  let score = 50;
  if (profile.previousHealthScores && profile.previousHealthScores.length > 0) score += 15;
  if (profile.weaknesses && profile.weaknesses.length > 0) score += 15;
  if (patternCount > 0) score += 20;

  // Acceptance = a human agreed with the suggestion (weaker signal).
  if (departmentAcceptanceRates && profile.recommendedDepartments) {
    const rates = profile.recommendedDepartments
      .map((id) => departmentAcceptanceRates[id])
      .filter((r) => r !== undefined && r !== null);
    if (rates.length > 0) {
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      score += Math.round((avgRate - 50) * 0.2); // small nudge, not overwhelming the base score
    }
  }

  // Outcome = reality confirmed or refuted the recommendation (stronger signal,
  // weighted higher than acceptance — this is what actually closes the ELOS loop).
  if (departmentOutcomeRates && profile.recommendedDepartments) {
    const rates = profile.recommendedDepartments
      .map((id) => departmentOutcomeRates[id])
      .filter((r) => r !== undefined && r !== null);
    if (rates.length > 0) {
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      score += Math.round((avgRate - 50) * 0.35);
    }
  }

  return Math.max(0, Math.min(100, score));
}

module.exports = { calculateConfidence };
