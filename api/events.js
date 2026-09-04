const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");

// Generic ELOS event ingestion — System 02 of the ELOS spec.
// Any BSTM app (CabLink, FlowLedger, Marketplace, BSTM-X, THoBoCoin) can POST
// a Standard Event Object here instead of building a bespoke endpoint.
const VALID_ENTITY_TYPES = [
  "USER", "BUSINESS", "CUSTOMER", "DEPARTMENT", "ROOM", "PROJECT", "TASK",
  "TRIAL", "OPPORTUNITY", "SERVICE", "PRODUCT", "TRANSACTION", "DOCUMENT",
  "CAMPAIGN", "RECOMMENDATION", "OUTCOME",
];

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const body = req.body || {};
  if (!body.event_type || typeof body.event_type !== "string") {
    res.status(400).json({ error: "event_type is required (e.g. 'RIDE_COMPLETED', 'LEDGER_ENTRY_CREATED')" });
    return;
  }
  if (body.entity_type && !VALID_ENTITY_TYPES.includes(body.entity_type)) {
    res.status(400).json({ error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` });
    return;
  }

  const event = {
    event_type: body.event_type,
    source: body.source || "unknown",
    entity_type: body.entity_type || null,
    entity_id: body.entity_id || null,
    department_id: body.department_id || null,
    room_id: body.room_id || null,
    actor_id: body.actor_id || null,
    data: body.data || {},
    metadata: body.metadata || {},
    confidence: typeof body.confidence === "number" ? body.confidence : null,
    status: "RECEIVED",
  };

  const result = await store.insertEvent(event);
  if (!result.stored) {
    res.status(502).json({ received: true, stored: false, error: result.error });
    return;
  }
  res.status(200).json({ received: true, stored: true, event_id: result.event_id });
};
