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
  if (error) return { decisions: [] };
  const decisions = (data || []).map((r) => r.data).filter((d) => d && d.businessId);
  return { decisions };
}

async function recordLearningDecision(entry) {
  const { error } = await db().from("elos_learning_records").insert({ data: entry, new_knowledge: entry.decision });
  if (error) return { stored: false, error: error.message };
  return { stored: true };
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

module.exports = {
  db,
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
  listObservations,
};
