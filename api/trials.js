const { applyCors } = require("./_lib/cors");
const store = require("./_lib/supabase");

// Read-only. This is the source of truth for CONFIRMED/synced trials
// (the original 6 field trials plus anything submitted via api/save-trial.js).
// The app's local IndexedDB only holds this device's unsynced drafts.
module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET allowed" });
    return;
  }
  const { data, error } = await store.db().from("elos_trials").select("*").order("updated_at", { ascending: false });
  if (error) {
    res.status(200).json({ total: 0, trials: [], error: error.message });
    return;
  }
  res.status(200).json({ total: data.length, trials: data || [] });
};
