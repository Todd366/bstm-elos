// CI gate: fails the build if repo/ecosystem health drops below threshold.
// Run: node 08_sentinel_audit/ci-gate.js [minScore] (default 60)
const runAudit = require("./audit");

const MIN_SCORE = parseInt(process.argv[2], 10) || 60;
const report = runAudit();
const score = report && report.health ? report.health.score : 0;

console.log(`\nSentinel Audit gate: score=${score} threshold=${MIN_SCORE}`);

if (score < MIN_SCORE) {
  console.error(`FAIL: health score ${score} is below the required ${MIN_SCORE}.`);
  process.exit(1);
}
console.log("PASS");
