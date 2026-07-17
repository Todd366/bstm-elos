const fs = require("fs");
const path = require("path");

function patternCheck() {
    const root = path.resolve(__dirname, "../../");
    const patternDirectory = path.join(root, "03_pattern_intelligence");

    const requiredPatterns = [
        "archetype-agility-type.md",
        "archetype-exposure-type.md",
        "archetype-liquidity-type.md",
        "archetype-multisystem-type.md"
    ];

    const missingPatterns = [];

    requiredPatterns.forEach(file => {
        const filePath = path.join(patternDirectory, file);
        if (!fs.existsSync(filePath)) {
            missingPatterns.push(file);
        }
    });

    let patternCount = 0;
    if (fs.existsSync(patternDirectory)) {
        patternCount = fs.readdirSync(patternDirectory).filter(file => file.endsWith(".md")).length;
    }

    const validPatterns = requiredPatterns.length - missingPatterns.length;
    const integrityPercent = Math.round((validPatterns / requiredPatterns.length) * 100);

    let status = "HEALTHY";
    if (integrityPercent < 100 && integrityPercent >= 70) status = "WARNING";
    if (integrityPercent < 70) status = "CRITICAL";

    return {
        module: "Pattern Integrity",
        status,
        patternCount,
        requiredPatterns: requiredPatterns.length,
        missingPatterns,
        integrityPercent,
        timestamp: new Date().toISOString()
    };
}

module.exports = patternCheck;
