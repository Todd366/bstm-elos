const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");
const { calculateAcceptanceRate, calculateOutcomeSuccessRate } = require("../intelligence/learning");
const departments = require("../00_core/departments.json");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }

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
      return {
        department: d.id,
        name: d.name,
        acceptanceRate,
        totalDecisions: decisionCount,
        outcomeSuccessRate,
        totalOutcomes: outcomeCount,
      };
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
};
