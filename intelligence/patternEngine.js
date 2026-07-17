function detectPatterns(allProfiles, rules) {
  const minCount = (rules && rules.minObservationsForPattern) || 3;
  const byIndustry = {};

  allProfiles.forEach((p) => {
    const industry = p.industry || "Unknown";
    byIndustry[industry] = byIndustry[industry] || { total: 0, weaknessCounts: {} };
    byIndustry[industry].total += 1;
    (p.weaknesses || []).forEach((w) => {
      byIndustry[industry].weaknessCounts[w] = (byIndustry[industry].weaknessCounts[w] || 0) + 1;
    });
  });

  const patterns = [];
  Object.entries(byIndustry).forEach(([industry, data]) => {
    if (data.total < minCount) return;
    Object.entries(data.weaknessCounts).forEach(([weakness, count]) => {
      const pct = Math.round((count / data.total) * 100);
      if (pct >= 50) {
        patterns.push({
          industry,
          weakness,
          percentage: pct,
          sampleSize: data.total,
          statement: `${pct}% of ${industry} businesses show weakness in ${weakness}`,
        });
      }
    });
  });

  return { generatedAt: new Date().toISOString(), patterns };
}

module.exports = { detectPatterns };
