const CATEGORY_TO_DEPARTMENTS = {
  "Digital Presence": [4, 11],
  "Marketing & Customer Growth": [12, 11],
  "Financial Management": [17],
  "Operations": [25, 24],
  "Technology Readiness": [6, 7],
  "Customer Experience": [11, 12],
  "Growth & Strategy": [25, 19],
};

function matchDepartments(weaknesses, departments, threshold = 20) {
  const weaknessList = weaknesses || [];
  const weaknessText = weaknessList.join(" ").toLowerCase();

  const categoryBoost = {};
  weaknessList.forEach((w) => {
    const deptIds = CATEGORY_TO_DEPARTMENTS[w];
    if (deptIds) {
      deptIds.forEach((id) => {
        categoryBoost[id] = (categoryBoost[id] || 0) + 100;
      });
    }
  });

  const scored = departments.map((dept) => {
    let score = categoryBoost[dept.id] || 0;
    const matchedKeywords = [];

    dept.keywords.forEach((kw) => {
      if (weaknessText.includes(kw.toLowerCase())) {
        score += dept.weight;
        matchedKeywords.push(kw);
      }
    });

    if (categoryBoost[dept.id]) {
      matchedKeywords.push("category-match");
    }

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
