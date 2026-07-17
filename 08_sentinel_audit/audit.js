const repositoryCheck = require("./checks/repositoryCheck");
const trialCheck = require("./checks/trialCheck");
const patternCheck = require("./checks/patternCheck");
const principleCheck = require("./checks/principleCheck");
const ecosystemCheck = require("./checks/ecosystemCheck");
const calculateHealthScore = require("./scoring");
const generateReport = require("./report");
const saveAuditHistory = require("./historyWriter");
const analyzeTrend = require("./trend");

function runAudit() {
    const report = {
        system: "BSTM ELOS Sentinel",
        timestamp: new Date().toISOString(),
        repository: repositoryCheck(),
        trials: trialCheck(),
        patterns: patternCheck(),
        principles: principleCheck(),
        ecosystem: ecosystemCheck()
    };

    report.health = calculateHealthScore(report);

    return report;
}

const finalReport = runAudit();

console.log(JSON.stringify(finalReport, null, 2));
console.log(generateReport(finalReport));
console.log({
    historyFile: saveAuditHistory(finalReport)
});
console.log({
    trend: analyzeTrend()
});

module.exports = runAudit;
