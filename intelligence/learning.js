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

module.exports = { recordDecision, calculateAcceptanceRate };
