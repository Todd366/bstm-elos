const fs = require("fs");
const path = require("path");

function trialCheck() {
    const root = path.resolve(__dirname, "../../");
    const trialDir = path.join(root, "02_trial_intelligence");

    const result = {
        module: "Trial Integrity",
        status: "HEALTHY",
        trialCount: 0,
        validTrials: 0,
        invalidTrials: 0,
        issues: [],
        timestamp: new Date().toISOString()
    };

    if (!fs.existsSync(trialDir)) {
        result.status = "CRITICAL";
        result.issues.push("02_trial_intelligence folder missing");
        return result;
    }

    const files = fs.readdirSync(trialDir).filter(f => f.endsWith(".md"));
    result.trialCount = files.length;

    files.forEach(file => {
        if (file.startsWith("BSTM-") && file.endsWith(".md")) {
            result.validTrials += 1;
        } else {
            result.invalidTrials += 1;
            result.issues.push(`Invalid trial filename: ${file}`);
        }
    });

    result.integrityPercent = files.length === 0
        ? 0
        : Math.round((result.validTrials / files.length) * 100);

    if (result.integrityPercent < 100 && result.integrityPercent >= 70) {
        result.status = "WARNING";
    } else if (result.integrityPercent < 70) {
        result.status = "CRITICAL";
    }

    return result;
}

module.exports = trialCheck;
