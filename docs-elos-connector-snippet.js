// Drop this function into CabLink / FlowLedger / Marketplace / any BSTM app
// to send real observations into ELOS. Call it whenever something meaningful
// happens (a ride completed, an invoice created, a sale made, etc).

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

  const res = await fetch("https://bstm-elos.vercel.app/api/receive-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json(); // { received: true, businessId, report: {...} }
}

// To record whether a business actually adopted a recommended department:
async function sendFeedbackToELOS(businessId, departmentId, decision) {
  // decision: "accepted" or "rejected"
  const res = await fetch("https://bstm-elos.vercel.app/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, departmentId, decision }),
  });
  return res.json();
}
