const { createClient } = require("@supabase/supabase-js");

let _client = null;
function db() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars.");
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

async function upsertObservation(app, record) {
  const { error } = await db().from("elos_observations").insert({ app, data: record });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function getBusiness(slug) {
  const { data, error } = await db().from("elos_businesses").select("data").eq("business_slug", slug).maybeSingle();
  if (error || !data) return null;
  return data.data;
}

async function upsertBusiness(slug, profile) {
  const { error } = await db()
    .from("elos_businesses")
    .upsert(
      {
        business_slug: slug,
        name: profile.name,
        health_score: profile.currentHealthScore,
        confidence: profile.confidenceScore,
        data: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_slug" }
    );
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function listAllBusinessProfiles() {
  const { data, error } = await db().from("elos_businesses").select("data");
  if (error) return [];
  return (data || []).map((r) => r.data);
}

async function upsertPatternScan(record) {
  const { error } = await db()
    .from("elos_patterns")
    .upsert(
      {
        pattern_id: "auto-latest-scan",
        name: "Auto Pattern Scan (latest)",
        pattern_type: "auto",
        status: "ACTIVE",
        data: record,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pattern_id" }
    );
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function getLatestPatternScan() {
  const { data, error } = await db()
    .from("elos_patterns")
    .select("data")
    .eq("pattern_id", "auto-latest-scan")
    .maybeSingle();
  if (error || !data) return null;
  return data.data;
}

async function upsertDepartmentMatches(slug, record) {
  const { error } = await db().from("elos_department_matches").insert({ business_slug: slug, data: record });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function upsertRecommendations(slug, record) {
  const { error } = await db().from("elos_recommendations").insert({ business_slug: slug, data: record });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function getReport(businessId) {
  const { data, error } = await db()
    .from("elos_recommendations")
    .select("data")
    .eq("business_slug", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ? data.data : null;
}

async function upsertReport(businessId, report) {
  const { error } = await db()
    .from("elos_insights")
    .insert({ title: `Intelligence report: ${businessId}`, description: businessId, confidence: report.confidence, data: report });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function getLearningLog() {
  const { data, error } = await db().from("elos_learning_records").select("data").order("created_at", { ascending: true });
  if (error) return { decisions: [], outcomes: [] };
  const rows = (data || []).map((r) => r.data).filter(Boolean);
  const decisions = rows.filter((d) => d.decision);
  const outcomes = rows.filter((d) => d.result);
  return { decisions, outcomes };
}

async function recordLearningDecision(entry) {
  const { error } = await db().from("elos_learning_records").insert({ data: entry, new_knowledge: entry.decision });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
}

async function recordLearningOutcome(entry, recommendationId) {
  const { error } = await db()
    .from("elos_learning_records")
    .insert({ data: entry, related_recommendation: recommendationId || null, new_knowledge: entry.result });
  if (error) return { stored: false, error: error.message };

  // Also log to elos_outcomes for direct expected-vs-actual queries/reporting.
  await db().from("elos_outcomes").insert({
    recommendation_id: recommendationId || null,
    expected: entry.expected,
    actual: entry.actual,
    result: entry.result,
  });

  return { stored: true };
}

async function findLatestRecommendationId(businessSlug) {
  const { data, error } = await db()
    .from("elos_recommendations")
    .select("id")
    .eq("business_slug", businessSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

async function listObservations(sources) {
  const { data, error } = await db()
    .from("elos_observations")
    .select("app, data, created_at")
    .in("app", sources)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map((r) => ({ source: r.app, ...r.data }));
}

async function insertEvent(event) {
  const { data, error } = await db().from("elos_events").insert(event).select("event_id").maybeSingle();
  if (error) return { stored: false, error: error.message };
  return { stored: true, event_id: data ? data.event_id : null };
}

async function listEvents({ source, entity_type, entity_id, event_type, limit = 50 } = {}) {
  let q = db().from("elos_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (source) q = q.eq("source", source);
  if (entity_type) q = q.eq("entity_type", entity_type);
  if (entity_id) q = q.eq("entity_id", entity_id);
  if (event_type) q = q.eq("event_type", event_type);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

async function upsertAutoPatternRows(rows) {
  if (!rows.length) return { stored: true, count: 0 };
  const { error } = await db().from("elos_patterns").upsert(
    rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
    { onConflict: "pattern_id" }
  );
  if (error) return { stored: false, error: error.message };
  return { stored: true, count: rows.length };
}

async function getAutoPatternStatuses() {
  const { data, error } = await db().from("elos_patterns").select("pattern_id, status").like("pattern_id", "AUTO-%");
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => (map[r.pattern_id] = r.status));
  return map;
}

async function listPatterns() {
  const { data, error } = await db().from("elos_patterns").select("*").order("updated_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function listPrinciples() {
  const { data, error } = await db().from("elos_principles").select("*").order("updated_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function countNegativeOutcomes(archetype, departmentId) {
  const { data, error } = await db().from("elos_learning_records").select("data").not("data->>result", "is", null);
  if (error) return 0;
  return (data || []).filter(
    (r) => r.data.result === "negative" && r.data.archetype === archetype && r.data.departmentId === departmentId
  ).length;
}

async function proposePrincipleIfWarranted(entry) {
  // Auto-drafts an EXPERIMENTAL principle when the SAME archetype+department
  // combination has produced 2+ negative outcomes — a repeated contradiction
  // worth a human's attention, not a one-off. Nobody writes the prose; it's
  // assembled from the actual recorded evidence.
  if (entry.result !== "negative" || !entry.archetype || entry.departmentId == null) return null;

  const negativeCount = await countNegativeOutcomes(entry.archetype, entry.departmentId);
  if (negativeCount < 2) return null;

  const principle_id = `AUTO-PRIN-${entry.archetype.toLowerCase()}-dept${entry.departmentId}`;
  const { data: existing } = await db().from("elos_principles").select("principle_id").eq("principle_id", principle_id).maybeSingle();
  if (existing) return null; // already proposed, don't duplicate

  const content_md = `# ${principle_id} (auto-proposed, needs review)

**Observation:** Department ${entry.departmentId} recommendations for ${entry.archetype}-type
businesses have now produced ${negativeCount} negative outcomes.

**Latest case:** business "${entry.businessId}" — expected: ${JSON.stringify(entry.expected)}, actual: ${JSON.stringify(entry.actual)}.

**Suggested action:** Review whether a guardrail (like BSTM-PRIN-008 for Liquidity type)
should suppress this department for this archetype. This principle was drafted
automatically from recorded outcomes — it has not been reviewed by a human yet.`;

  const { error } = await db().from("elos_principles").insert({
    principle_id,
    name: `${entry.archetype} type — Department ${entry.departmentId} repeated negative outcome`,
    status: "EXPERIMENTAL",
    content_md,
    data: { autoGenerated: true, archetype: entry.archetype, departmentId: entry.departmentId, negativeCount },
  });
  if (error) return null;
  return principle_id;
}

module.exports = {
  db,
  insertEvent,
  listEvents,
  upsertAutoPatternRows,
  getAutoPatternStatuses,
  listPatterns,
  listPrinciples,
  proposePrincipleIfWarranted,
  upsertObservation,
  getBusiness,
  upsertBusiness,
  listAllBusinessProfiles,
  upsertPatternScan,
  getLatestPatternScan,
  upsertDepartmentMatches,
  upsertRecommendations,
  getReport,
  upsertReport,
  getLearningLog,
  recordLearningDecision,
  recordLearningOutcome,
  findLatestRecommendationId,
  listObservations,
};
