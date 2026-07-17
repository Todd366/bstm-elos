const fs = require("fs");
const path = require("path");

function principleCheck() {
    const root = path.resolve(__dirname, "../../");
    const principleRoot = path.join(root, "04_organizational_principles");

    const requiredSections = [
        "active_principles",
        "experimental_principles",
        "historical_principles",
        "rejected_principles"
    ];

    const missingSections = [];
    const sectionCounts = {};

    requiredSections.forEach(section => {
        const sectionPath = path.join(principleRoot, section);

        if (!fs.existsSync(sectionPath)) {
            missingSections.push(section);
            sectionCounts[section] = 0;
        } else {
            sectionCounts[section] = fs.readdirSync(sectionPath).filter(file => file.endsWith(".md")).length;
        }
    });

    const validSections = requiredSections.length - missingSections.length;
    const integrityPercent = Math.round((validSections / requiredSections.length) * 100);

    let status = "HEALTHY";
    if (integrityPercent < 100 && integrityPercent >= 70) status = "WARNING";
    if (integrityPercent < 70) status = "CRITICAL";

    return {
        module: "Principle Integrity",
        status,
        sections: sectionCounts,
        missingSections,
        integrityPercent,
        timestamp: new Date().toISOString()
    };
}

module.exports = principleCheck;
