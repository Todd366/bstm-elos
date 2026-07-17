function calculateHealthScore(report) {

    const weights = {
        repository: 10,
        trials: 20,
        patterns: 15,
        principles: 20,
        ecosystem: 15,
        code: 10,
        database: 5,
        accuracy: 5
    };

    const scores = {
        repository:
        report.repository?.integrityPercent || 0,

        trials:
        report.trials?.integrityPercent || 0,

        patterns:
        report.patterns?.integrityPercent || 0,

        principles:
        report.principles?.integrityPercent || 0,

        ecosystem:
        report.ecosystem?.integrityPercent || 0,

        code: 0,
        database: 0,
        accuracy: 0
    };

    let total = 0;

    Object.keys(weights).forEach(layer => {
        total +=
        scores[layer] *
        (weights[layer] / 100);
    });

    let status = "HEALTHY";

    if (total < 70) {
        status = "WARNING";
    }

    if (total < 50) {
        status = "CRITICAL";
    }

    return {
        module:
        "ELOS Health Index",

        score:
        Math.round(total),

        status,

        weights,

        subsystemScores:
        scores,

        timestamp:
        new Date().toISOString()
    };

}

module.exports = calculateHealthScore;
