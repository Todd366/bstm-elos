const store = require("./_lib/supabase");
const { applyCors } = require("./_lib/cors");

const SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    const observations = await store.listObservations(SOURCES);
    res.status(200).json({ total: observations.length, observations });
  } catch (err) {
    res.status(200).json({ total: 0, observations: [], error: String(err.message || err) });
  }
};
