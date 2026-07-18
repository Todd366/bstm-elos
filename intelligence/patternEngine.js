function detectPatterns(allProfiles, rules) {
  const minIndustryCount = (rules && rules.minObservationsForPattern) || 3;
  const minEcosystemCount = 2; // ecosystem-wide patterns can fire sooner — small dataset, still worth surfacing signal

  const patterns = [];

  // --- Industry-level patterns (only fires once enough same-industry data exists) ---
  const byIndustry = {};
  allProfiles.forEach((p) => {
    const industry = p.industry || "Unknown";
    byIndustry[industry] = byIndustry[industry] || { total: 0, weaknessCounts: {} };
    byIndustry[industry].total += 1;
    (p.weaknesses || []).forEach((w) => {
      byIndustry[industry].weaknessCounts[w] = (byIndustry[industry].weaknessCounts[w] || 0) + 1;
    });
  });

  Object.entries(byIndustry).forEach(([industry, data]) => {
    if (data.total < minIndustryCount) return;
    Object.entries(data.weaknessCounts).forEach(([weakness, count]) => {
      const pct = Math.round((count / data.total) * 100);
      if (pct >= 50) {
        patterns.push({
          scope: "industry",
          industry,
          weakness,
          percentage: pct,
          sampleSize: data.total,
          statement: `${pct}% of businesses in "${industry}" show weakness in ${weakness}`,
        });
      }
    });
  });

  // --- Ecosystem-wide patterns (fires across ALL businesses regardless of industry) ---
  const total = allProfiles.length;
  const weaknessCounts = {};
  allProfiles.forEach((p) => {
    (p.weaknesses || []).forEach((w) => {
      weaknessCounts[w] = (weaknessCounts[w] || 0) + 1;
    });
  });

  if (total >= minEcosystemCount) {
    Object.entries(weaknessCounts).forEach(([weakness, count]) => {
      const pct = Math.round((count / total) * 100);
      if (pct >= 40) {
        patterns.push({
          scope: "ecosystem",
          weakness,
          percentage: pct,
          sampleSize: total,
          statement: `${pct}% of all audited businesses (${count}/${total}) show weakness in ${weakness}`,
        });
      }
    });
  }

  // --- Department demand across the whole ecosystem ---
  const deptDemand = {};
  allProfiles.forEach((p) => {
    (p.recommendedDepartments || []).forEach((deptId) => {
      deptDemand[deptId] = (deptDemand[deptId] || 0) + 1;
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    totalBusinessesAnalyzed: total,
    patterns,
    departmentDemand: deptDemand,
  };
}

module.exports = { detectPatterns };
