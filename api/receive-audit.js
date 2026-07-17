const { applyCors } = require("./_lib/cors");
const { commitJSON } = require("./_lib/github-commit");
const { readJSON, listDir } = require("./_lib/github-read");
const { buildOrUpdateProfile, slugify } = require("../intelligence/profileBuilder");
const { detectPatterns } = require("../intelligence/patternEngine");
const { matchDepartments } = require("../intelligence/matcher");
const { generateRecommendations } = require("../intelligence/recommender");
const { calculateConfidence } = require("../intelligence/confidence");

const departments = require("../00_core/departments.json");
const rules = require("../00_core/rules.json");
const weights = require("../00_core/weights.json");

const ALLOWED_SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const body = req.body || {};
  const source = ALLOWED_SOURCES.includes(body.source) ? body.source : "unknown";
  const now = new Date();
  const stamp = now.toISOString().replace(/:/g, "-").split(".")[0];

  // 1. Store raw observation (unchanged behavior)
  const obsPath = `01_observations/${source}/${stamp}.json`;
  const obsRecord = { ...body, _receivedAt: now.toISOString(), _id: `${source}-${stamp}` };
  const obsResult = await commitJSON({
    path: obsPath,
    message: `Observation: ${source} @ ${now.toISOString()}`,
    record: obsRecord,
  });

  // 2. Build / update business profile
  const businessId = slugify(body.business?.name);
  const profilePath = `10_profiles/businesses/${businessId}.json`;
  const existingProfile = await readJSON(profilePath);
  const profile = buildOrUpdateProfile(existingProfile, body);
  await commitJSON({ path: profilePath, message: `Profile update: ${businessId}`, record: profile });

  // 3. Detect patterns across ALL known profiles
  const profileFiles = await listDir("10_profiles/businesses");
  const allProfiles = [];
  for (const f of profileFiles) {
    const p = await readJSON(`10_profiles/businesses/${f.name}`);
    if (p) allProfiles.push(p);
  }
  const patternResult = detectPatterns(allProfiles, rules);
  await commitJSON({
    path: `11_pattern_intelligence_auto/latest.json`,
    message: `Pattern scan @ ${now.toISOString()}`,
    record: patternResult,
  });

  // 4. Match against ALL 30 departments (always)
  const matches = matchDepartments(profile.weaknesses, departments, weights.matchThreshold);
  await commitJSON({
    path: `13_department_matches/${businessId}.json`,
    message: `Department match: ${businessId}`,
    record: { businessId, generatedAt: now.toISOString(), matches },
  });

  // 5. Generate recommendations
  const recommendations = generateRecommendations(matches, weights.maxRecommendations);
  await commitJSON({
    path: `12_recommendations/${businessId}.json`,
    message: `Recommendations: ${businessId}`,
    record: { businessId, generatedAt: now.toISOString(), recommendations },
  });

  // 6. Confidence + final intelligence report
  const confidence = calculateConfidence(profile, patternResult.patterns.length);
  const report = {
    businessId,
    businessName: profile.name,
    industry: profile.industry,
    healthScore: profile.currentHealthScore,
    criticalProblems: profile.weaknesses.length,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    detectedPatterns: patternResult.patterns.filter((p) => p.industry === profile.industry),
    recommendedDepartments: recommendations,
    estimatedTimelineWeeks: recommendations.reduce((max, r) => Math.max(max, r.estimatedTimelineWeeks), 0),
    confidence,
    generatedAt: now.toISOString(),
  };

  profile.recommendedDepartments = recommendations.map((r) => r.department);
  profile.confidenceScore = confidence;
  await commitJSON({ path: profilePath, message: `Profile finalized: ${businessId}`, record: profile });
  await commitJSON({
    path: `output/intelligence-report-${businessId}.json`,
    message: `Intelligence report: ${businessId}`,
    record: report,
  });

  res.status(200).json({
    received: true,
    observation: obsResult,
    businessId,
    report,
  });
};
