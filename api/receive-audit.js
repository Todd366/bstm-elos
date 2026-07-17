const ALLOWED_SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const body = req.body || {};
  const source = ALLOWED_SOURCES.includes(body.source) ? body.source : "unknown";

  const now = new Date();
  const stamp = now.toISOString().replace(/:/g, "-").split(".")[0];
  const path = `01b_app_telemetry/${source}/${stamp}.json`;

  const record = { ...body, _receivedAt: now.toISOString(), _id: `${source}-${stamp}` };

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    res.status(200).json({
      received: true,
      stored: false,
      warning: "GITHUB_TOKEN / GITHUB_REPO not set in Vercel env vars yet.",
      record,
    });
    return;
  }

  try {
    const content = Buffer.from(JSON.stringify(record, null, 2)).toString("base64");
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ message: `Telemetry: ${source} @ ${now.toISOString()}`, content }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      res.status(502).json({ received: true, stored: false, error: errText });
      return;
    }

    res.status(200).json({ received: true, stored: true, path, id: record._id, timestamp: record._receivedAt });
  } catch (err) {
    res.status(500).json({ received: true, stored: false, error: String(err) });
  }
};
