const fs = require("fs");
const path = require("path");

function analyzeTrend() {
    const historyPath = path.resolve(__dirname, "history");

    if (!fs.existsSync(historyPath)) {
        return {
            status: "NO_HISTORY"
        };
    }

    const files = fs.readdirSync(historyPath)
        .filter(file => file.endsWith(".json"))
        .sort();

    if (files.length < 2) {
        return {
            status: "INSUFFICIENT_DATA",
            message: "Need at least two audit records"
        };
    }

    const previous = JSON.parse(
        fs.readFileSync(path.join(historyPath, files[files.length - 2]))
    );

    const current = JSON.parse(
        fs.readFileSync(path.join(historyPath, files[files.length - 1]))
    );

    const previousScore = previous.health.score;
    const currentScore = current.health.score;
    const change = currentScore - previousScore;
    const subsystemScores = current.health.subsystemScores;
    const sorted = Object.entries(subsystemScores).sort((a, b) => b[1] - a[1]);

    let direction = "STABLE";
    if (change > 0) {
        direction = "UPWARD";
    }
    if (change < 0) {
        direction = "DOWNWARD";
    }

    return {
        module: "Sentinel Trend Analysis",
        previousScore,
        currentScore,
        change,
        direction,
        strongestSubsystem: sorted[0][0],
        weakestSubsystem: sorted[sorted.length - 1][0],
        auditsCompared: 2,
        timestamp: new Date().toISOString()
    };
}

module.exports = analyzeTrend;
