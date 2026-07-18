function calculateConfidence(profile, patternCount, departmentAcceptanceRates) {
  let score = 50;
  if (profile.previousHealthScores && profile.previousHealthScores.length > 0) score += 15;
  if (profile.weaknesses && profile.weaknesses.length > 0) score += 15;
  if (patternCount > 0) score += 20;

  // If we have real-world feedback on this business's recommended departments,
  // let historical acceptance nudge confidence — this is what makes ELOS
  // actually learn instead of just repeating static rules forever.
  if (departmentAcceptanceRates && profile.recommendedDepartments) {
    const rates = profile.recommendedDepartments
      .map((id) => departmentAcceptanceRates[id])
      .filter((r) => r !== undefined && r !== null);
    if (rates.length > 0) {
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      score += Math.round((avgRate - 50) * 0.2); // small nudge, not overwhelming the base score
    }
  }

  return Math.max(0, Math.min(100, score));
}

module.exports = { calculateConfidence };
