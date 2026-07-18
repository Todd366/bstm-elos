const { applyCors } = require("./_lib/cors");
const { commitJSON } = require("./_lib/github-commit");
const { readJSON } = require("./_lib/github-read");
const { recordDecision } = require("../intelligence/learning");

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

  const path = "14_learning/decisions.json";
  const existing = (await readJSON(path)) || { decisions: [] };
  const updated = recordDecision(existing, businessId, departmentId, decision);

  const result = await commitJSON({
    path,
    message: `Feedback: ${businessId} ${decision} dept ${departmentId}`,
    record: updated,
  });

  res.status(200).json({ recorded: true, ...result, totalDecisions: updated.decisions.length });
};
