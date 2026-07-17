async function commitJSON({ path, message, record }) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return { stored: false, warning: "GITHUB_TOKEN / GITHUB_REPO not set in Vercel env vars." };
  }

  const content = Buffer.from(JSON.stringify(record, null, 2)).toString("base64");
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ message, content }),
  });

  if (!res.ok) {
    return { stored: false, error: await res.text() };
  }
  return { stored: true, path };
}

module.exports = { commitJSON };
