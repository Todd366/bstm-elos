// Drop these functions into CabLink / FlowLedger / Marketplace / any BSTM app
// to send real observations into ELOS. Call sendToELOS whenever something
// meaningful happens (a ride completed, an invoice created, a sale made, etc).
//
// AUTH: set ELOS_INGEST_KEY as an env var in THIS app (same value as the one
// set in the bstm-elos Vercel project). Until both sides have it set, these
// calls still work unauthenticated (ELOS fails open until configured) — but
// set it as soon as you deploy this so the endpoint is actually locked down.

const ELOS_BASE_URL = "https://bstm-elos.vercel.app";
const ELOS_INGEST_KEY = process.env.ELOS_INGEST_KEY || ""; // set this in your app's env vars

function elosHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (ELOS_INGEST_KEY) headers["x-elos-api-key"] = ELOS_INGEST_KEY;
  return headers;
}

async function sendToELOS(sourceName, businessInfo, metrics) {
  // sourceName must be one of: "cablink", "flowledger", "marketplace", "business-health-audit"
  const payload = {
    source: sourceName,
    business: businessInfo, // { name, industry, location }
    scores: {
      overall: metrics.overall,       // 0-100 health estimate for this business, if you have one
      categories: metrics.categories, // optional: { "Financial Management": 40, ... }
    },
    diagnosis: {
      strengths: metrics.strengths || [],
      weaknesses: metrics.weaknesses || [], // e.g. ["Financial Management"] — use the SAME
                                             // 7 category names as Business Health Audit:
                                             // Digital Presence, Marketing & Customer Growth,
                                             // Financial Management, Operations,
                                             // Technology Readiness, Customer Experience,
                                             // Growth & Strategy
    },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(`${ELOS_BASE_URL}/api/receive-audit`, {
    method: "POST",
    headers: elosHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json(); // { received: true, businessId, report: {...} }
}

// To record whether a business actually adopted a recommended department:
async function sendFeedbackToELOS(businessId, departmentId, decision) {
  // decision: "accepted" or "rejected"
  const res = await fetch(`${ELOS_BASE_URL}/api/feedback`, {
    method: "POST",
    headers: elosHeaders(),
    body: JSON.stringify({ businessId, departmentId, decision }),
  });
  return res.json();
}

// To record what ACTUALLY happened after a recommendation was implemented —
// this is the strongest signal ELOS uses, weighted higher than acceptance.
async function sendOutcomeToELOS(businessId, departmentId, result, expected, actual, notes) {
  // result: "positive" | "negative" | "neutral"
  const res = await fetch(`${ELOS_BASE_URL}/api/outcomes`, {
    method: "POST",
    headers: elosHeaders(),
    body: JSON.stringify({ businessId, departmentId, result, expected, actual, notes }),
  });
  return res.json();
}

// For anything that doesn't fit the business-audit shape above — a generic
// event (a ride completed, a payment processed, a listing created, etc).
// entity_type, if set, must be one of: USER, BUSINESS, CUSTOMER, DEPARTMENT,
// ROOM, PROJECT, TASK, TRIAL, OPPORTUNITY, SERVICE, PRODUCT, TRANSACTION,
// DOCUMENT, CAMPAIGN, RECOMMENDATION, OUTCOME
async function sendEventToELOS(eventType, sourceName, entityType, entityId, data) {
  const res = await fetch(`${ELOS_BASE_URL}/api/events`, {
    method: "POST",
    headers: elosHeaders(),
    body: JSON.stringify({ event_type: eventType, source: sourceName, entity_type: entityType, entity_id: entityId, data }),
  });
  return res.json();
}
