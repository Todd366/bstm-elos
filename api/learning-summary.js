const { applyCors } = require("./_lib/cors");
const { readJSON } = require("./_lib/github-read");
const { calculateAcceptanceRate } = require("../intelligence/learning");
const departments = require("../00_core/departments.json");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }

  const log = (await readJSON("14_learning/decisions.json")) || { decisions: [] };
  const overallRate = calculateAcceptanceRate(log);

  const byDepartment = departments
    .map((d) => {
      const rate = calculateAcceptanceRate(log, d.id);
      const count = (log.decisions || []).filter((dec) => dec.departmentId === d.id).length;
      return rate === null ? null : { department: d.id, name: d.name, acceptanceRate: rate, totalDecisions: count };
    })
    .filter(Boolean)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate);

  res.status(200).json({
    totalDecisionsRecorded: (log.decisions || []).length,
    overallAcceptanceRate: overallRate,
    byDepartment,
  });
};
