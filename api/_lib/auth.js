/**
 * Shared-secret auth for write endpoints (receive-audit, events, outcomes,
 * feedback, save-trial). Read-only endpoints stay public — they power the
 * Command Center dashboard and other apps' read access.
 *
 * Fails OPEN (allows the request through, logs a warning) if
 * ELOS_INGEST_KEY is not yet set in the environment, so existing producer
 * apps (business-health-audit, cablink, flowledger, marketplace) keep
 * working uninterrupted until they're each updated to send the header.
 * Once ELOS_INGEST_KEY is set, it is fully enforced.
 *
 * Producer apps send: header "x-elos-api-key: <the key>"
 *
 * Returns true if the request is authorized (or auth isn't configured yet).
 * Writes a 401 response and returns false if a key IS configured and the
 * request's key doesn't match.
 */
function requireApiKey(req, res) {
  const expected = process.env.ELOS_INGEST_KEY;
  if (!expected) {
    console.warn("ELOS_INGEST_KEY not set — write endpoint is currently UNAUTHENTICATED. Set it in Vercel env vars to lock this down.");
    return true;
  }

  const provided = req.headers["x-elos-api-key"];
  if (provided !== expected) {
    res.status(401).json({ error: "Missing or invalid x-elos-api-key header." });
    return false;
  }
  return true;
}

module.exports = { requireApiKey };
