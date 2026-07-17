function calculateConfidence(profile, patternCount) {
  let score = 50;
  if (profile.previousHealthScores && profile.previousHealthScores.length > 0) score += 15;
  if (profile.weaknesses && profile.weaknesses.length > 0) score += 15;
  if (patternCount > 0) score += 20;
  return Math.min(100, score);
}

module.exports = { calculateConfidence };
