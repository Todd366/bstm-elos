const { commitJSON } = require("./_lib/github-commit");
const ALLOWED_SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }
  const body = req.body || {};
  const source = ALLOWED_SOURCES.includes(body.source) ? body.source : "unknown";
  const now = new Date();
  const stamp = now.toISOString().replace(/:/g, "-").split(".")[0];
  const path = `01_observations/${source}/${stamp}.json`;
  const record = { ...body, _receivedAt: now.toISOString(), _id: `${source}-${stamp}` };

  const result = await commitJSON({ path, message: `Observation: ${source} @ ${now.toISOString()}`, record });
  res.status(result.stored === false && result.error ? 502 : 200).json({ received: true, ...result, id: record._id });
};
