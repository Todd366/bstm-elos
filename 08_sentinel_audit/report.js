const fs = require("fs");
const path = require("path");

function generateReport(audit) {
    const outputDirectory = path.resolve(__dirname, "../output");

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }

    const jsonPath = path.join(outputDirectory, "esa_audit_report.json");
    const markdownPath = path.join(outputDirectory, "esa_audit_report.md");

    fs.writeFileSync(
        jsonPath,
        JSON.stringify(audit, null, 2)
    );

    const markdown = `# ELOS Sentinel Audit Report

Generated:
${audit.timestamp}


## Overall Health

Score:
${audit.health.score}%

Status:
${audit.health.status}


## Subsystem Health


| System | Score |
|---|---:|
| Repository | ${audit.health.subsystemScores.repository}% |
| Trials | ${audit.health.subsystemScores.trials}% |
| Patterns | ${audit.health.subsystemScores.patterns}% |
| Principles | ${audit.health.subsystemScores.principles}% |
| Ecosystem | ${audit.health.subsystemScores.ecosystem}% |
| Code | ${audit.health.subsystemScores.code}% |
| Database | ${audit.health.subsystemScores.database}% |
| Accuracy | ${audit.health.subsystemScores.accuracy}% |


## Issues

Code, database, and accuracy modules are pending implementation.


## Sentinel Principle

ELOS audits itself before trusting its intelligence.
`;

    fs.writeFileSync(markdownPath, markdown);

    return {
        jsonReport: jsonPath,
        markdownReport: markdownPath
    };
}

module.exports = generateReport;
