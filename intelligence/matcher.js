function matchDepartments(weaknesses, departments, threshold = 20) {
  const weaknessText = (weaknesses || []).join(" ").toLowerCase();

  const scored = departments.map((dept) => {
    let score = 0;
    const matchedKeywords = [];
    dept.keywords.forEach((kw) => {
      if (weaknessText.includes(kw.toLowerCase())) {
        score += dept.weight;
        matchedKeywords.push(kw);
      }
    });
    return {
      department: dept.id,
      name: dept.name,
      score,
      matchedKeywords,
      relevant: score >= threshold,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

module.exports = { matchDepartments };
