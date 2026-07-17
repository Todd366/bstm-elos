const fs = require("fs");
const path = require("path");

function repositoryCheck() {
    const root = path.resolve(__dirname, "../../");

    const requiredFolders = [
        "01_raw_observations",
        "02_trial_intelligence",
        "03_pattern_intelligence",
        "04_organizational_principles",
        "05_metrics",
        "06_ecosystem_registry",
        "08_sentinel_audit",
        "documentation",
        "templates",
        "scripts"
    ];

    const missingFolders = [];

    requiredFolders.forEach(folder => {
        const folderPath = path.join(root, folder);
        if (!fs.existsSync(folderPath)) {
            missingFolders.push(folder);
        }
    });

    const existingCount = requiredFolders.length - missingFolders.length;
    const integrityPercent = Math.round((existingCount / requiredFolders.length) * 100);

    let status = "HEALTHY";
    if (integrityPercent < 100 && integrityPercent >= 70) status = "WARNING";
    if (integrityPercent < 70) status = "CRITICAL";

    return {
        module: "Repository Integrity",
        status,
        requiredFolders: requiredFolders.length,
        existingFolders: existingCount,
        missingFolders,
        integrityPercent,
        timestamp: new Date().toISOString()
    };
}

module.exports = repositoryCheck;
