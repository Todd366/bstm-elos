const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }
  const { source, entity_type, entity_id, event_type, limit } = req.query;
  const events = await store.listEvents({ source, entity_type, entity_id, event_type, limit: limit ? parseInt(limit, 10) : 50 });
  res.status(200).json({ total: events.length, events });
};
