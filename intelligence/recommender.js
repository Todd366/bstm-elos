function impactStars(score) {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

function generateRecommendations(matchedDepartments, maxRecs = 6) {
  const relevant = matchedDepartments.filter((d) => d.relevant).slice(0, maxRecs);

  return relevant.map((d, idx) => ({
    priority: idx + 1,
    department: d.department,
    name: d.name,
    reason: d.matchedKeywords.length
      ? `Matched on: ${d.matchedKeywords.join(", ")}`
      : "General relevance",
    impact: impactStars(d.score),
    estimatedDifficulty: d.score >= 80 ? "Low" : d.score >= 50 ? "Medium" : "High",
    estimatedTimelineWeeks: d.score >= 80 ? 2 : d.score >= 50 ? 4 : 8,
  }));
}

module.exports = { generateRecommendations };
