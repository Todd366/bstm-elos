const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");
const { buildOrUpdateProfile, slugify } = require("../intelligence/profileBuilder");
const { detectPatterns } = require("../intelligence/patternEngine");
const { classifyArchetype, applyArchetypeGuardrail } = require("../intelligence/archetypeEngine");
const { matchDepartments } = require("../intelligence/matcher");
const { generateRecommendations } = require("../intelligence/recommender");
const { calculateConfidence } = require("../intelligence/confidence");
const { calculateAcceptanceRate } = require("../intelligence/learning");

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

  try {
    const body = req.body || {};
    const source = ALLOWED_SOURCES.includes(body.source) ? body.source : "unknown";
    const now = new Date();

    const obsRecord = { ...body, _receivedAt: now.toISOString(), _id: `${source}-${now.toISOString()}` };
    const obsResult = await store.upsertObservation(source, obsRecord);

    const businessId = slugify(body.business?.name);
    const existingProfile = await store.getBusiness(businessId);
    const profile = buildOrUpdateProfile(existingProfile, body);

    // Archetype classification — operationalizes the 6-trial pattern intelligence
    const archetypeResult = classifyArchetype(profile);
    profile.archetype = archetypeResult.archetype;
    profile.archetypeConfidence = archetypeResult.confidence;
    profile.archetypeEvidence = archetypeResult.evidence;
    profile.archetypeGuardrail = archetypeResult.guardrail;
    await store.upsertBusiness(businessId, profile);

    const allProfiles = await store.listAllBusinessProfiles();
    const patternResult = detectPatterns(allProfiles, rules);
    await store.upsertPatternScan(patternResult);

    let matches = matchDepartments(profile.weaknesses, departments, weights.matchThreshold);
    matches = applyArchetypeGuardrail(matches, archetypeResult);
    await store.upsertDepartmentMatches(businessId, {
      businessId,
      generatedAt: now.toISOString(),
      archetype: archetypeResult.archetype,
      matches,
    });

    const recommendations = generateRecommendations(matches, weights.maxRecommendations);
    await store.upsertRecommendations(businessId, {
      businessId,
      generatedAt: now.toISOString(),
      archetype: archetypeResult.archetype,
      guardrailApplied: archetypeResult.guardrail,
      recommendations,
    });

    const learningLog = await store.getLearningLog();
    const acceptanceRates = {};
    departments.forEach((d) => {
      const rate = calculateAcceptanceRate(learningLog, d.id);
      if (rate !== null) acceptanceRates[d.id] = rate;
    });
    const confidence = calculateConfidence(profile, patternResult.patterns.length, acceptanceRates);
    const report = {
      businessId,
      businessName: profile.name,
      industry: profile.industry,
      healthScore: profile.currentHealthScore,
      archetype: archetypeResult.archetype,
      archetypeConfidence: archetypeResult.confidence,
      archetypeGuardrailNote: archetypeResult.guardrailNote,
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
    await store.upsertBusiness(businessId, profile);
    await store.upsertReport(businessId, report);

    await store.insertEvent({
      event_type: "BUSINESS_HEALTH_AUDIT_PROCESSED",
      source,
      entity_type: "BUSINESS",
      entity_id: businessId,
      data: { archetype: archetypeResult.archetype, healthScore: profile.currentHealthScore },
      confidence: confidence / 100,
      status: "PROCESSED",
    });

    res.status(200).json({ received: true, observation: obsResult, businessId, report });
  } catch (err) {
    res.status(502).json({ received: false, error: String(err.message || err) });
  }
};
