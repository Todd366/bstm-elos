const fs = require("fs");
const path = require("path");

function ecosystemCheck() {
    const root = path.resolve(__dirname, "../../");
    const ecosystemRoot = path.join(root, "06_ecosystem_registry");

    const requiredFiles = [
        "README.md",
        "capability_registry.md",
        "department_index.md",
        "room_mapping.md"
    ];

    const missingFiles = [];

    requiredFiles.forEach(file => {
        const filePath = path.join(ecosystemRoot, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    });

    const validFiles = requiredFiles.length - missingFiles.length;
    const integrityPercent = Math.round((validFiles / requiredFiles.length) * 100);

    let status = "HEALTHY";
    if (integrityPercent < 100 && integrityPercent >= 70) {
        status = "WARNING";
    }
    if (integrityPercent < 70) {
        status = "CRITICAL";
    }

    return {
        module: "Ecosystem Integrity",
        status,
        requiredFiles: requiredFiles.length,
        validFiles,
        missingFiles,
        integrityPercent,
        timestamp: new Date().toISOString()
    };
}

module.exports = ecosystemCheck;
