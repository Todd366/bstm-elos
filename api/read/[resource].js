const { applyCors } = require("../_lib/cors");
const store = require("../_lib/supabase");
const { calculateAcceptanceRate, calculateOutcomeSuccessRate } = require("../../intelligence/learning");
const departments = require("../../00_core/departments.json");

// Consolidated read-only router. Vercel Hobby plan caps a deployment at 12
// serverless functions — 8 thin GET-only endpoints were merged into this one
// dynamic route (/api/read/:resource) to leave headroom for the write
// endpoints (receive-audit, save-trial, feedback, outcomes, events) which
// stay as separate functions. Nothing here writes anything.
const OBSERVATION_SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

async function ecosystemIntelligence(req, res) {
  const profiles = await store.listAllBusinessProfiles();
  const patternResult = await store.getLatestPatternScan();

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
      archetype: p.archetype || "Unclassified",
      archetypeConfidence: p.archetypeConfidence != null ? p.archetypeConfidence : null,
    })),
  });
}

async function learningSummary(req, res) {
  const log = await store.getLearningLog();
  const overallAcceptanceRate = calculateAcceptanceRate(log);
  const overallOutcomeSuccessRate = calculateOutcomeSuccessRate(log);

  const byDepartment = departments
    .map((d) => {
      const acceptanceRate = calculateAcceptanceRate(log, d.id);
      const outcomeSuccessRate = calculateOutcomeSuccessRate(log, d.id);
      const decisionCount = (log.decisions || []).filter((dec) => dec.departmentId === d.id).length;
      const outcomeCount = (log.outcomes || []).filter((o) => o.departmentId === d.id).length;
      if (acceptanceRate === null && outcomeSuccessRate === null) return null;
      return { department: d.id, name: d.name, acceptanceRate, totalDecisions: decisionCount, outcomeSuccessRate, totalOutcomes: outcomeCount };
    })
    .filter(Boolean)
    .sort((a, b) => (b.outcomeSuccessRate || 0) - (a.outcomeSuccessRate || 0));

  res.status(200).json({
    totalDecisionsRecorded: (log.decisions || []).length,
    totalOutcomesRecorded: (log.outcomes || []).length,
    overallAcceptanceRate,
    overallOutcomeSuccessRate,
    byDepartment,
  });
}

async function listObservations(req, res) {
  try {
    const observations = await store.listObservations(OBSERVATION_SOURCES);
    res.status(200).json({ total: observations.length, observations });
  } catch (err) {
    res.status(200).json({ total: 0, observations: [], error: String(err.message || err) });
  }
}

async function listEvents(req, res) {
  const { source, entity_type, entity_id, event_type, limit } = req.query;
  const events = await store.listEvents({ source, entity_type, entity_id, event_type, limit: limit ? parseInt(limit, 10) : 50 });
  res.status(200).json({ total: events.length, events });
}

async function listPatterns(req, res) {
  const patterns = await store.listPatterns();
  res.status(200).json({ total: patterns.length, patterns });
}

async function listPrinciples(req, res) {
  const principles = await store.listPrinciples();
  res.status(200).json({ total: principles.length, principles });
}

async function listTrials(req, res) {
  const { data, error } = await store.db().from("elos_trials").select("*").order("updated_at", { ascending: false });
  if (error) {
    res.status(200).json({ total: 0, trials: [], error: error.message });
    return;
  }
  res.status(200).json({ total: data.length, trials: data || [] });
}

async function intelligenceReport(req, res) {
  const businessId = req.query.businessId;
  if (!businessId) {
    res.status(400).json({ error: "businessId query param required" });
    return;
  }
  const report = await store.getReport(businessId);
  if (!report) {
    res.status(404).json({ error: "Report not found for this businessId" });
    return;
  }
  res.status(200).json(report);
}

const HANDLERS = {
  "ecosystem-intelligence": ecosystemIntelligence,
  "learning-summary": learningSummary,
  "list-observations": listObservations,
  "list-events": listEvents,
  patterns: listPatterns,
  principles: listPrinciples,
  trials: listTrials,
  "intelligence-report": intelligenceReport,
};

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }
  const resource = req.query.resource;
  const fn = HANDLERS[resource];
  if (!fn) {
    res.status(404).json({ error: `Unknown resource '${resource}'. Valid: ${Object.keys(HANDLERS).join(", ")}` });
    return;
  }
  try {
    await fn(req, res);
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
};
