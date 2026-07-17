const fs = require("fs");
const path = require("path");

function saveAuditHistory(report) {
    const historyDirectory = path.resolve(__dirname, "history");

    if (!fs.existsSync(historyDirectory)) {
        fs.mkdirSync(historyDirectory);
    }

    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, "-");
    const filename = `ESA-${timestamp}.json`;
    const filepath = path.join(historyDirectory, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    return filepath;
}

module.exports = saveAuditHistory;
