const fs = require("fs");
const path = require("path");

function saveAuditHistory(report) {
    const historyDirectory = path.resolve(__dirname, "history");

    if (!fs.existsSync(historyDirectory)) {
        fs.mkdirSync(historyDirectory);
    }

    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, "-");
    const auditId = `ESA-${timestamp}`;
    const filename = `${auditId}.json`;
    const filepath = path.join(historyDirectory, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Best-effort mirror to Supabase so audit history is centrally queryable.
    // Never blocks or throws — local file write above is always the source of truth.
    mirrorToSupabase(auditId, report).catch(() => {});

    return filepath;
}

async function mirrorToSupabase(auditId, report) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const score = report && report.health ? report.health.score : null;
    const status = report && report.health ? report.health.status : null;

    await fetch(`${url}/rest/v1/elos_sentinel_audits`, {
        method: "POST",
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ audit_id: auditId, score, status, data: report }),
    });
}

module.exports = saveAuditHistory;
