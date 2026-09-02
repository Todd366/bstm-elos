const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }
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
};
