const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");

// Read-only. Every row here was written by the engine (intelligence/patternPromotion.js,
// triggered from api/receive-audit.js) — there is no write path a human uses to author these.
module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }
  const patterns = await store.listPatterns();
  res.status(200).json({ total: patterns.length, patterns });
};
