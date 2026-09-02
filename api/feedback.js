const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");
const { recordDecision, calculateAcceptanceRate } = require("../intelligence/learning");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const { businessId, departmentId, decision } = req.body || {};
  if (!businessId || !departmentId || !["accepted", "rejected"].includes(decision)) {
    res.status(400).json({ error: "Required: businessId, departmentId, decision ('accepted'|'rejected')" });
    return;
  }

  const entry = recordDecision({ decisions: [] }, businessId, departmentId, decision).decisions[0];
  const result = await store.recordLearningDecision(entry);
  const log = await store.getLearningLog();

  res.status(200).json({ recorded: true, ...result, totalDecisions: log.decisions.length });
};
