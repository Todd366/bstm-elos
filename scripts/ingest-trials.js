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

// Wider rating vocabulary — "Not recorded" / "Not fully recorded" = no data, skip
const RATING_SCORES = {
  good: 100, strong: 100,
  fair: 50, moderate: 50,
  poor: 0, weak: 0,
};

// Fallback signal for trials with NO checklist: the trial's own diagnosed
// bottleneck type, taken straight from frontmatter (actual_bottleneck).
const BOTTLENECK_TO_CATEGORY = {
  exposure: "Marketing & Customer Growth",
  liquidity: "Financial Management",
  "multi-system": "Operations",
  agility: "Operations",
};

function extractExplicitDepartments(text) {
  const found = new Set();
  const re = /\b([1-9]|[12][0-9]|30)\b\s*[–—-]?\s*[A-Z][A-Za-z .&]{3,40}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = parseInt(m[1], 10);
    if (id >= 1 && id <= 30) found.add(id);
  }
  // Also catch "Room 17", "Room 17 — FlowLedger" style references
  const roomRe = /\bRoom\s+([1-9]|[12][0-9]|30)\b/gi;
  while ((m = roomRe.exec(text)) !== null) {
    found.add(parseInt(m[1], 10));
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
  const re = /-\s*([A-Za-z &\/]+):\s*(Good|Fair|Poor|Weak|Strong|Moderate)\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const dim = m[1].trim().toLowerCase();
    ratings[dim] = m[2].toLowerCase();
  }
  return ratings;
}

function ingestTrial(filename) {
  const filePath = path.join(TRIALS_DIR, filename);
  const text = fs.readFileSync(filePath, "utf-8");
  const fm = parseFrontmatter(text);
  const ratings = parseChecklistRatings(text);
  const explicitDepts = extractExplicitDepartments(text);

  const categoryScoreLists = {};
  Object.entries(ratings).forEach(([dim, rating]) => {
    const category = DIMENSION_TO_CATEGORY[dim];
    const score = RATING_SCORES[rating];
    if (!category || score === undefined) return;
    (categoryScoreLists[category] ||= []).push(score);
  });

  let finalScores = {};
  Object.entries(categoryScoreLists).forEach(([cat, arr]) => {
    finalScores[cat] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  });

  let usedFallback = false;
  // No checklist data at all → use the trial's own diagnosed bottleneck
  if (Object.keys(finalScores).length === 0 && fm.actual_bottleneck) {
    const bottleneck = fm.actual_bottleneck.toLowerCase();
    const category = BOTTLENECK_TO_CATEGORY[bottleneck];
    if (category) {
      finalScores[category] = 15; // diagnosed critical bottleneck = severe weakness
      usedFallback = true;
    }
  }

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

  const weaknesses = Object.entries(finalScores).filter(([, v]) => v < 50).map(([k]) => k);
  const strengths = Object.entries(finalScores).filter(([, v]) => v >= 70).map(([k]) => k);

  const businessName = fm.title || filename;
  const industry = fm.actual_bottleneck ? `Bottleneck: ${fm.actual_bottleneck}` : "Unknown";

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
  profile.diagnosedBottleneck = fm.actual_bottleneck || null;
  profile.usedBottleneckFallback = usedFallback;

  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  console.log(
    `✓ ${filename} → ${businessId} | score ${overall} | weaknesses: ${weaknesses.join(", ") || "none"}` +
    (usedFallback ? ` | (used bottleneck fallback: ${fm.actual_bottleneck})` : "")
  );

  return profile;
}

const trialFiles = fs.readdirSync(TRIALS_DIR).filter((f) => f.startsWith("BSTM-100T-") && f.endsWith(".md"));
if (trialFiles.length === 0) {
  console.log("No trial files found.");
  process.exit(0);
}

const newProfiles = trialFiles.map(ingestTrial);

const allProfileFiles = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));
const allProfiles = allProfileFiles.map((f) => JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), "utf-8")));
const patternResult = detectPatterns(allProfiles, rules);
fs.writeFileSync(path.join(PATTERNS_DIR, "latest.json"), JSON.stringify(patternResult, null, 2));
console.log(`\n✓ Pattern scan: ${patternResult.patterns.length} pattern(s) across ${allProfiles.length} profiles`);

newProfiles.forEach((profile) => {
  const matches = matchDepartments(profile.weaknesses, departments, weights.matchThreshold);

  (profile.explicitDepartments || []).forEach((deptId) => {
    const entry = matches.find((m) => m.department === deptId);
    if (entry) {
      entry.score += 60;
      entry.matchedKeywords.push("explicit-trial-mapping");
      entry.relevant = true;
    }
  });

  // If bottleneck fallback was used, directly boost the matching department
  if (profile.diagnosedBottleneck) {
    const boostMap = { liquidity: 17, exposure: 12, "multi-system": 25, agility: 25 };
    const deptId = boostMap[profile.diagnosedBottleneck.toLowerCase()];
    const entry = matches.find((m) => m.department === deptId);
    if (entry) {
      entry.score += 80;
      entry.matchedKeywords.push(`diagnosed-bottleneck:${profile.diagnosedBottleneck}`);
      entry.relevant = true;
    }
  }

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
    diagnosedBottleneck: profile.diagnosedBottleneck,
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

  console.log(`✓ Report: ${profile.name} → ${recommendations.length} dept(s), ${confidence}% confidence`);
});

console.log("\n🧠 ELOS re-trained with wider rating vocabulary + bottleneck fallback.");
