const { applyCors } = require("./_lib/cors");
const { requireApiKey } = require("./_lib/auth");
const store = require("./_lib/supabase");
const { recordOutcome } = require("../intelligence/learning");

const VALID_RESULTS = ["positive", "negative", "neutral"];

// Closes the ELOS loop: records what ACTUALLY happened after a recommended
// department/service was implemented, distinct from whether it was merely
// accepted (see api/feedback.js). This is the signal confidence.js weighs
// most heavily — reality, not opinion. When the same archetype+department
// combination repeatedly produces negative outcomes, the engine auto-drafts
// a candidate principle for review — nobody writes it by hand.
module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }
  if (!requireApiKey(req, res)) return;

  const { businessId, departmentId, result, expected, actual, notes } = req.body || {};
  if (!businessId || !departmentId || !VALID_RESULTS.includes(result)) {
    res.status(400).json({
      error: "Required: businessId, departmentId, result ('positive'|'negative'|'neutral'). Optional: expected, actual, notes",
    });
    return;
  }

  const business = await store.getBusiness(businessId);
  const archetype = business ? business.archetype : null;

  const recommendationId = await store.findLatestRecommendationId(businessId);
  const entry = recordOutcome(businessId, departmentId, recommendationId, result, expected, actual, archetype);
  if (notes) entry.notes = notes;

  const stored = await store.recordLearningOutcome(entry, recommendationId);
  const proposedPrincipleId = await store.proposePrincipleIfWarranted(entry);

  await store.insertEvent({
    event_type: "RECOMMENDATION_OUTCOME_RECORDED",
    source: "elos-outcomes-api",
    entity_type: "BUSINESS",
    entity_id: businessId,
    department_id: String(departmentId),
    data: { result, expected, actual, archetype, autoProposedPrinciple: proposedPrincipleId },
    status: "PROCESSED",
  });

  res.status(200).json({
    recorded: true,
    ...stored,
    linkedRecommendationId: recommendationId,
    autoProposedPrinciple: proposedPrincipleId,
  });
};
