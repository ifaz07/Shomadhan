// ─── Priority Scoring Service ─────────────────────────────────────────────
// Calculates complaint priority based on keywords, category, emergency flag,
// vote count, and location sensitivity.

const KEYWORD_TIERS = {
  critical: [
    'fire', 'collapse', 'explosion', 'flood', 'flooding', 'electrocution',
    'gas leak', 'death', 'died', 'injury', 'injured', 'blood', 'accident',
    'unconscious', 'emergency', 'burst pipe', 'structural failure',
  ],
  high: [
    'dangerous', 'hazard', 'hazardous', 'open manhole', 'broken wire',
    'live wire', 'no water', 'blackout', 'power cut', 'toxic', 'sewage',
    'chemical', 'fallen tree', 'pothole', 'overflow', 'sewage overflow',
    'contaminated', 'contamination', 'urgent', 'critical',
  ],
  medium: [
    'damaged', 'broken', 'blocked', 'leaking', 'leak', 'overflowing',
    'dirty', 'smell', 'odor', 'noise', 'crack', 'cracked', 'delay',
    'not working', 'faulty', 'missing', 'incomplete',
  ],
};

const CATEGORY_SCORES = {
  Safety: 20,
  Electricity: 15,
  Water: 15,
  Road: 10,
  Environment: 8,
  Waste: 8,
  Other: 5,
};

const SENSITIVE_LOCATION_KEYWORDS = [
  'hospital', 'school', 'market', 'bridge', 'station', 'university',
  'government', 'ministry', 'court', 'airport', 'park', 'mosque', 'temple',
];

/**
 * Calculates priority for a complaint object.
 * @param {Object} complaint - { title, description, category, isEmergency, voteCount, location }
 * @returns {'Low'|'Medium'|'High'|'Critical'}
 */
function calculatePriority(complaint) {
  let score = 0;
  const text = `${complaint.title || ''} ${complaint.description || ''}`.toLowerCase();

  // ── A. Severity keywords (only highest tier counts) ────────────────
  if (KEYWORD_TIERS.critical.some((kw) => text.includes(kw))) {
    score += 30;
  } else if (KEYWORD_TIERS.high.some((kw) => text.includes(kw))) {
    score += 20;
  } else if (KEYWORD_TIERS.medium.some((kw) => text.includes(kw))) {
    score += 10;
  }

  // ── B. Category base score ─────────────────────────────────────────
  score += CATEGORY_SCORES[complaint.category] || 5;

  // ── C. Emergency flag ──────────────────────────────────────────────
  if (complaint.isEmergency) score += 25;

  // ── D. Vote count boost ────────────────────────────────────────────
  const votes = complaint.voteCount || 0;
  if (votes >= 50) score += 20;
  else if (votes >= 20) score += 15;
  else if (votes >= 10) score += 10;
  else if (votes >= 5) score += 5;

  // ── E. Location sensitivity (max +10) ─────────────────────────────
  const locationText = (complaint.location || '').toLowerCase();
  let locationBonus = 0;
  for (const kw of SENSITIVE_LOCATION_KEYWORDS) {
    if (locationText.includes(kw)) {
      locationBonus += 2;
      if (locationBonus >= 10) break;
    }
  }
  score += locationBonus;

  // ── Thresholds ─────────────────────────────────────────────────────
  if (score >= 50) return 'Critical';
  if (score >= 30) return 'High';
  if (score >= 15) return 'Medium';
  return 'Low';
}

module.exports = { calculatePriority };
