function slugify(name) {
  return String(name || "unknown-business")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildOrUpdateProfile(existingProfile, observation) {
  const business = observation.business || {};
  const scores = observation.scores || {};
  const now = new Date().toISOString();
  const id = slugify(business.name);

  const prevScores = existingProfile?.previousHealthScores || [];
  if (existingProfile?.currentHealthScore !== undefined) {
    prevScores.push({ score: existingProfile.currentHealthScore, at: existingProfile.lastUpdated });
  }

  const profile = {
    businessId: id,
    name: business.name || "Unknown",
    industry: business.industry || "Unknown",
    location: business.location || "Unknown",
    currentHealthScore: scores.overall ?? existingProfile?.currentHealthScore ?? 0,
    categoryScores: scores.categories || existingProfile?.categoryScores || {},
    previousHealthScores: prevScores,
    weaknesses: (observation.diagnosis && observation.diagnosis.weaknesses) || [],
    strengths: (observation.diagnosis && observation.diagnosis.strengths) || [],
    recommendedDepartments: existingProfile?.recommendedDepartments || [],
    completedImprovements: existingProfile?.completedImprovements || [],
    patternHistory: existingProfile?.patternHistory || [],
    confidenceScore: existingProfile?.confidenceScore || 0,
    lastUpdated: now,
    createdAt: existingProfile?.createdAt || now,
  };

  return profile;
}

module.exports = { buildOrUpdateProfile, slugify };
