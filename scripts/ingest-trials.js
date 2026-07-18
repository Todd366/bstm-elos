const fs = require("fs");
const path = require("path");

const { buildOrUpdateProfile, slugify } = require("../intelligence/profileBuilder");
const { detectPatterns } = require("../intelligence/patternEngine");
const { matchDepartments } = require("../intelligence/matcher");
const { generateRecommendations } = require("../intelligence/recommender");
const { calculateConfidence } = require("../intelligence/confidence");

const departments = require("../00_core/departments.json");
const rules = require("../00_core/rules.json");
const weights = require("../00_core/weights.json");

const TRIALS_DIR = path.join(__dirname, "..", "02_trial_intelligence");
const PROFILES_DIR = path.join(__dirname, "..", "10_profiles", "businesses");
const MATCHES_DIR = path.join(__dirname, "..", "13_department_matches");
const RECS_DIR = path.join(__dirname, "..", "12_recommendations");
const OUTPUT_DIR = path.join(__dirname, "..", "output");
const PATTERNS_DIR = path.join(__dirname, "..", "11_pattern_intelligence_auto");

[PROFILES_DIR, MATCHES_DIR, RECS_DIR, OUTPUT_DIR, PATTERNS_DIR].forEach((d) =>
  fs.mkdirSync(d, { recursive: true })
);

// Checklist dimension → audit-category mapping (reuses the same 7 categories
// the Business Health Audit app already scores against)
const DIMENSION_TO_CATEGORY = {
  "marketing & branding": "Marketing & Customer Growth",
  "marketing and branding": "Marketing & Customer Growth",
  "technology used": "Technology Readiness",
  "technology being used": "Technology Readiness",
  "technology currently used": "Technology Readiness",
  "payment methods": "Technology Readiness",
  "customer experience": "Customer Experience",
  "staff and roles": "Operations",
  "staff & roles": "Operations",
  "products or services": "Operations",
  "products/services": "Operations",
  "cleanliness & organization": "Operations",
  "cleanliness and organization": "Operations",
  "security observations": "Operations",
};

// Department numbers explicitly written in each trial's own ecosystem mapping —
// this is data Todd already produced by hand; trust it directly.
function extractExplicitDepartments(text) {
  const found = new Set();
  const re = /\b([1-9]|[12][0-9]|30)\b\s*[–—-]?\s*[A-Z][A-Za-z .&]{3,40}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = parseInt(m[1], 10);
    if (id >= 1 && id <= 30) found.add(id);
  }
  return Array.from(found);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return {};
  const fm = {};
  match[1].split("\n").forEach((line) => {
    const kv = line.match(/^([a-zA-Z_]+):\s*"?(.*?)"?\s*$/);
    if (kv) fm[kv[1]] = kv[2];
  });
  return fm;
}

function parseChecklistRatings(text) {
  const ratings = {};
  const re = /-\s*([A-Za-z &\/]+):\s*(Good|Fair|Poor)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const dim = m[1].trim().toLowerCase();
    ratings[dim] = m[2];
  }
  return ratings;
}

function ratingToScore(rating) {
  if (rating === "Good") return 100;
  if (rating === "Fair") return 50;
  if (rating === "Poor") return 0;
  return null;
}

function ingestTrial(filename) {
  const filePath = path.join(TRIALS_DIR, filename);
  const text = fs.readFileSync(filePath, "utf-8");
  const fm = parseFrontmatter(text);
  const ratings = parseChecklistRatings(text);
  const explicitDepts = extractExplicitDepartments(text);

  const categoryScores = {};
  Object.entries(ratings).forEach(([dim, rating]) => {
    const category = DIMENSION_TO_CATEGORY[dim];
    if (!category) return;
    const score = ratingToScore(rating);
    if (score === null) return;
    if (!(category in categoryScores)) categoryScores[category] = [];
    categoryScores[category].push(score);
  });

  const finalScores = {};
  Object.entries(categoryScores).forEach(([cat, arr]) => {
    finalScores[cat] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  });

  let overall;
  const scoreVals = Object.values(finalScores);
  if (scoreVals.length > 0) {
    overall = Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length);
  } else if (fm.overall_trial_score) {
    const num = parseFloat(fm.overall_trial_score);
    overall = isNaN(num) ? 50 : Math.round(num * 10);
  } else {
    overall = 50;
  }

  const weaknesses = Object.entries(finalScores)
    .filter(([, v]) => v < 50)
    .map(([k]) => k);
  const strengths = Object.entries(finalScores)
    .filter(([, v]) => v >= 70)
    .map(([k]) => k);

  const businessName = fm.business_name || fm.title || filename;
  const industry = fm.category || "Unknown";

  const observationLike = {
    business: { name: businessName, industry, location: "Botswana" },
    scores: { overall, categories: finalScores },
    diagnosis: { strengths, weaknesses },
  };

  const businessId = slugify(businessName);
  const profilePath = path.join(PROFILES_DIR, `${businessId}.json`);
  const existing = fs.existsSync(profilePath)
    ? JSON.parse(fs.readFileSync(profilePath, "utf-8"))
    : null;

  const profile = buildOrUpdateProfile(existing, observationLike);
  profile.sourceTrial = fm.trial_id || filename;
  profile.explicitDepartments = explicitDepts;

  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  console.log(`✓ Ingested ${filename} → ${businessId} (score ${overall}, weaknesses: ${weaknesses.join(", ") || "none"})`);

  return profile;
}

// 1. Ingest every trial file
const trialFiles = fs
  .readdirSync(TRIALS_DIR)
  .filter((f) => f.startsWith("BSTM-100T-") && f.endsWith(".md"));

if (trialFiles.length === 0) {
  console.log("No trial files found in 02_trial_intelligence/");
  process.exit(0);
}

const newProfiles = trialFiles.map(ingestTrial);

// 2. Detect patterns across ALL profiles (trials + any prior test data)
const allProfileFiles = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));
const allProfiles = allProfileFiles.map((f) =>
  JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), "utf-8"))
);
const patternResult = detectPatterns(allProfiles, rules);
fs.writeFileSync(path.join(PATTERNS_DIR, "latest.json"), JSON.stringify(patternResult, null, 2));
console.log(`\n✓ Pattern scan complete: ${patternResult.patterns.length} pattern(s) detected across ${allProfiles.length} profiles`);

// 3. For each newly ingested trial: match departments, blend in explicit
//    department mentions, generate recommendations, write final report
newProfiles.forEach((profile) => {
  const matches = matchDepartments(profile.weaknesses, departments, weights.matchThreshold);

  // Blend in departments the trial already explicitly identified
  (profile.explicitDepartments || []).forEach((deptId) => {
    const entry = matches.find((m) => m.department === deptId);
    if (entry) {
      entry.score += 60;
      entry.matchedKeywords.push("explicit-trial-mapping");
      entry.relevant = true;
    }
  });
  matches.sort((a, b) => b.score - a.score);

  fs.writeFileSync(
    path.join(MATCHES_DIR, `${profile.businessId}.json`),
    JSON.stringify({ businessId: profile.businessId, generatedAt: new Date().toISOString(), matches }, null, 2)
  );

  const recommendations = generateRecommendations(matches, weights.maxRecommendations);
  fs.writeFileSync(
    path.join(RECS_DIR, `${profile.businessId}.json`),
    JSON.stringify({ businessId: profile.businessId, generatedAt: new Date().toISOString(), recommendations }, null, 2)
  );

  const confidence = calculateConfidence(profile, patternResult.patterns.length);
  profile.recommendedDepartments = recommendations.map((r) => r.department);
  profile.confidenceScore = confidence;
  fs.writeFileSync(path.join(PROFILES_DIR, `${profile.businessId}.json`), JSON.stringify(profile, null, 2));

  const report = {
    businessId: profile.businessId,
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
    sourceTrial: profile.sourceTrial,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `intelligence-report-${profile.businessId}.json`),
    JSON.stringify(report, null, 2)
  );

  console.log(`✓ Report generated for ${profile.name}: ${recommendations.length} department(s) recommended, ${confidence}% confidence`);
});

console.log("\n🧠 ELOS trained on existing 100 Trials data.");
