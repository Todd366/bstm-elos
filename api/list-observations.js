const SOURCES = ["business-health-audit", "cablink", "flowledger", "marketplace"];

module.exports = async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    res.status(200).json({ total: 0, observations: [], warning: "GITHUB_TOKEN/GITHUB_REPO not set" });
    return;
  }

  const observations = [];
  for (const source of SOURCES) {
    const listRes = await fetch(`https://api.github.com/repos/${repo}/contents/01_observations/${source}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!listRes.ok) continue;
    const files = await listRes.json();
    if (!Array.isArray(files)) continue;
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      try {
        const fileRes = await fetch(file.download_url);
        const data = await fileRes.json();
        observations.push({ source, filename: file.name, ...data });
      } catch {}
    }
  }

  observations.sort((a, b) => new Date(b._receivedAt || 0) - new Date(a._receivedAt || 0));
  res.status(200).json({ total: observations.length, observations });
};
