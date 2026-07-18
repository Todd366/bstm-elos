const { applyCors } = require("./_lib/cors");
const { readJSON, listDir } = require("./_lib/github-read");
const departments = require("../00_core/departments.json");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }

  const profileFiles = await listDir("10_profiles/businesses");
  const profiles = [];
  for (const f of profileFiles) {
    const p = await readJSON(`10_profiles/businesses/${f.name}`);
    if (p) profiles.push(p);
  }

  const patternResult = await readJSON("11_pattern_intelligence_auto/latest.json");

  const deptDemandRaw = (patternResult && patternResult.departmentDemand) || {};
  const deptDemand = Object.entries(deptDemandRaw)
    .map(([id, count]) => {
      const dept = departments.find((d) => d.id === parseInt(id, 10));
      return { department: parseInt(id, 10), name: dept ? dept.name : "Unknown", businessesNeedingIt: count };
    })
    .sort((a, b) => b.businessesNeedingIt - a.businessesNeedingIt);

  const avgHealthScore = profiles.length
    ? Math.round(profiles.reduce((sum, p) => sum + (p.currentHealthScore || 0), 0) / profiles.length)
    : 0;

  const avgConfidence = profiles.length
    ? Math.round(profiles.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / profiles.length)
    : 0;

  res.status(200).json({
    generatedAt: new Date().toISOString(),
    totalBusinessesProfiled: profiles.length,
    averageHealthScore: avgHealthScore,
    averageConfidence: avgConfidence,
    topDepartmentDemand: deptDemand.slice(0, 10),
    detectedPatterns: (patternResult && patternResult.patterns) || [],
    businesses: profiles.map((p) => ({
      businessId: p.businessId,
      name: p.name,
      healthScore: p.currentHealthScore,
      weaknesses: p.weaknesses,
      recommendedDepartments: p.recommendedDepartments,
      confidence: p.confidenceScore,
    })),
  });
};
