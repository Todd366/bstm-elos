function recordDecision(learningLog, businessId, departmentId, decision) {
  // decision: "accepted" | "rejected"
  const entry = {
    businessId,
    departmentId,
    decision,
    decidedAt: new Date().toISOString(),
  };
  learningLog.decisions = learningLog.decisions || [];
  learningLog.decisions.push(entry);
  return learningLog;
}

function calculateAcceptanceRate(learningLog, departmentId) {
  const decisions = (learningLog.decisions || []).filter(
    (d) => departmentId === undefined || d.departmentId === departmentId
  );
  if (decisions.length === 0) return null;
  const accepted = decisions.filter((d) => d.decision === "accepted").length;
  return Math.round((accepted / decisions.length) * 100);
}

/**
 * Outcomes are a distinct, stronger signal than acceptance decisions:
 * acceptance only means a human agreed with the suggestion, outcome means
 * reality confirmed (or refuted) it. This is the actual "learning" the ELOS
 * spec's System 13/14 (Action & Outcome Engine, Learning Engine) describe.
 */
function recordOutcome(businessId, departmentId, recommendationId, result, expected, actual) {
  // result: "positive" | "negative" | "neutral"
  return {
    businessId,
    departmentId,
    recommendationId: recommendationId || null,
    result,
    expected: expected || null,
    actual: actual || null,
    recordedAt: new Date().toISOString(),
  };
}

function calculateOutcomeSuccessRate(learningLog, departmentId) {
  const outcomes = (learningLog.outcomes || []).filter(
    (o) => departmentId === undefined || o.departmentId === departmentId
  );
  if (outcomes.length === 0) return null;
  const positive = outcomes.filter((o) => o.result === "positive").length;
  return Math.round((positive / outcomes.length) * 100);
}

module.exports = {
  recordDecision,
  calculateAcceptanceRate,
  recordOutcome,
  calculateOutcomeSuccessRate,
};
