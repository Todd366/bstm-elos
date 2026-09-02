const store = require("./_lib/supabase");
const { applyCors } = require("./_lib/cors");

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }
  const trial = req.body || {};
  const trialId = trial.trial_id || `UNTITLED-${Date.now()}`;
  const now = new Date();

  try {
    const { error } = await store
      .db()
      .from("elos_trials")
      .upsert(
        {
          trial_id: trialId,
          business_slug: trial.business_slug || null,
          title: trial.title || trialId,
          content_md: trial.content_md || null,
          data: { ...trial, _receivedAt: now.toISOString() },
          updated_at: now.toISOString(),
        },
        { onConflict: "trial_id" }
      );
    if (error) throw error;
    res.status(200).json({ received: true, stored: true, id: trialId });
  } catch (err) {
    res.status(502).json({ received: true, stored: false, error: String(err.message || err), id: trialId });
  }
};
