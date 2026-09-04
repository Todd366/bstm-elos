/**
 * Classifies a business profile into one of the field-validated BSTM archetypes
 * (03_pattern_intelligence/) instead of relying on raw weakness-percentage matching.
 *
 * Evidence base: BSTM-100T-001..006. See documentation/archetype-*.md for the
 * human-reviewed definitions this encodes.
 */

const MARKETING_WEAKNESS = "Marketing & Customer Growth";
const FINANCE_WEAKNESS = "Financial Management";
const OPERATIONS_WEAKNESS = "Operations";
const TECH_WEAKNESS = "Technology Readiness";
const CX_WEAKNESS = "Customer Experience";

const MOBILE_KEYWORDS = ["mobile", "vehicle", "van", "stall", "hawker", "pop-up", "pop up"];

function has(weaknesses, w) {
  return (weaknesses || []).includes(w);
}

function isMobileSignal(profile) {
  const text = `${profile.industry || ""} ${profile.name || ""} ${profile.locationNotes || ""}`.toLowerCase();
  return MOBILE_KEYWORDS.some((k) => text.includes(k));
}

function classifyArchetype(profile) {
  const weaknesses = profile.weaknesses || [];
  const strengths = profile.strengths || [];
  const weaknessCount = weaknesses.length;

  // --- Liquidity Type (BSTM-100T-006 / Jikisa) ---
  // Financial Management is the weakness while Operations/Marketing are NOT both weak —
  // i.e. demand and delivery capability exist, capital velocity is the actual constraint.
  if (
    has(weaknesses, FINANCE_WEAKNESS) &&
    !has(weaknesses, MARKETING_WEAKNESS) &&
    weaknessCount <= 2
  ) {
    return {
      archetype: "Liquidity",
      confidence: 80,
      evidence: "archetype-liquidity-type",
      guardrail: "BSTM-PRIN-008-visibility-illusion",
      guardrailNote:
        "Do not recommend demand-generation departments (Marketing/Social Media/Advertising). This business has demand; it needs capital/restocking velocity.",
    };
  }

  // --- Multi-System Type (BSTM-100T-004, BSTM-100T-005) ---
  // Broad weakness spread across Operations AND Technology Readiness simultaneously —
  // signature of cross-subsidizing, unsynchronized operations under one roof.
  if (has(weaknesses, OPERATIONS_WEAKNESS) && has(weaknesses, TECH_WEAKNESS) && weaknessCount >= 3) {
    return {
      archetype: "Multi-System",
      confidence: 75,
      evidence: "archetype-multisystem-type",
      guardrail: null,
      guardrailNote:
        "Prioritize System Integration & API / Data Science before any growth-facing intervention — per-line accounting must exist first.",
    };
  }
  if (has(weaknesses, OPERATIONS_WEAKNESS) && weaknessCount >= 4) {
    return {
      archetype: "Multi-System",
      confidence: 60,
      evidence: "archetype-multisystem-type",
      guardrail: null,
      guardrailNote: "Broad operational weakness spread — verify for cross-subsidization before recommending growth spend.",
    };
  }

  // --- Agility Type (BSTM-100T-003 / Nado) ---
  // Structural signal (mobile/no fixed location) rather than a pure weakness signature.
  if (isMobileSignal(profile)) {
    return {
      archetype: "Agility",
      confidence: 65,
      evidence: "archetype-agility-type",
      guardrail: null,
      guardrailNote: "Prioritize real-time inventory/location coordination systems over static storefront tooling.",
    };
  }

  // --- Exposure Type (BSTM-100T-001, BSTM-100T-002) ---
  // Marketing/visibility is the dominant or sole weakness, and the business can already
  // fulfill demand (Operations/Financial Management are strengths, not weaknesses).
  if (
    has(weaknesses, MARKETING_WEAKNESS) &&
    !has(weaknesses, FINANCE_WEAKNESS) &&
    !has(weaknesses, OPERATIONS_WEAKNESS)
  ) {
    return {
      archetype: "Exposure",
      confidence: 80,
      evidence: "archetype-exposure-type",
      guardrail: null,
      guardrailNote: null,
    };
  }
  if (has(weaknesses, MARKETING_WEAKNESS) || has(weaknesses, CX_WEAKNESS)) {
    return {
      archetype: "Exposure",
      confidence: 55,
      evidence: "archetype-exposure-type",
      guardrail: null,
      guardrailNote: null,
    };
  }

  return {
    archetype: "Unclassified",
    confidence: 30,
    evidence: "meta-classification-framework",
    guardrail: null,
    guardrailNote: "Insufficient signal to match a confirmed archetype — needs more field evidence.",
  };
}

/**
 * Applies archetype guardrails to a matched-department list before recommendations
 * are generated. This is where BSTM-PRIN-008 actually takes effect operationally.
 */
function applyArchetypeGuardrail(matches, archetypeResult) {
  if (!archetypeResult || archetypeResult.archetype !== "Liquidity") return matches;

  const SUPPRESSED_FOR_LIQUIDITY = [11, 12]; // Social Media Management, Digital Marketing & Advertising
  const BOOSTED_FOR_LIQUIDITY = [17]; // Finance & Accounting

  return matches.map((m) => {
    if (SUPPRESSED_FOR_LIQUIDITY.includes(m.department)) {
      return { ...m, relevant: false, score: 0, matchedKeywords: [], guardrailSuppressed: "BSTM-PRIN-008" };
    }
    if (BOOSTED_FOR_LIQUIDITY.includes(m.department) && !m.relevant) {
      return { ...m, relevant: true, score: Math.max(m.score, 250), matchedKeywords: [...(m.matchedKeywords || []), "BSTM-PRIN-008-boost"] };
    }
    return m;
  });
}

module.exports = { classifyArchetype, applyArchetypeGuardrail };
