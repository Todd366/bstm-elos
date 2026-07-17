const { commitJSON } = require("./_lib/github-commit");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }
  const trial = req.body || {};
  const trialId = trial.trial_id || `UNTITLED-${Date.now()}`;
  const path = `02_trial_intelligence_raw/${trialId}.json`;
  const now = new Date();
  const record = { ...trial, _receivedAt: now.toISOString() };

  const result = await commitJSON({ path, message: `Trial submitted: ${trialId}`, record });
  res.status(result.stored === false && result.error ? 502 : 200).json({ received: true, ...result, id: trialId });
};
