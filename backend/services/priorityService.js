/**
 * Priority Service
 * Automatically determines complaint priority (Low / Medium / High / Critical)
 * based on: category, emergency flag, vote count, and location sensitivity.
 */

const {
  normalizeDepartmentKey,
} = require("../utils/departmentTaxonomy");

// Departments ranked by inherent severity
const CATEGORY_BASE_PRIORITY = {
  public_safety: 3,
  police: 3,
  electricity: 2,
  water_authority: 2,
  health: 2,
  public_works: 1,
  sanitation: 1,
  environment: 1,
  transport: 1,
  animal_control: 1,
};

// Keywords in location string that indicate sensitive sites → +1 level
const SENSITIVE_LOCATION_KEYWORDS = [
  'hospital', 'school', 'college', 'university', 'clinic', 'court',
  'police', 'fire station', 'parliament', 'secretariat', 'military',
  'bank', 'power plant', 'water treatment', 'market', 'bazar', 'bazaar',
  'madrasa', 'mosque', 'temple', 'church', 'railway', 'airport', 'bus station',
];

/**
 * Convert numeric score → priority label
 */
const scoreToPriority = (score) => {
  if (score >= 4) return 'Critical';
  if (score >= 3) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
};

/**
 * calculatePriority
 * @param {object} params
 * @param {string}  params.category       - Complaint category
 * @param {boolean} params.emergencyFlag  - Manually flagged as emergency
 * @param {number}  params.voteCount      - Current upvote count
 * @param {string}  [params.location]     - Location description string
 * @returns {string} 'Low' | 'Medium' | 'High' | 'Critical'
 */
const calculatePriority = ({ category, emergencyFlag, voteCount, location = '' }) => {
  const normalizedCategory = normalizeDepartmentKey(category);
  let score = CATEGORY_BASE_PRIORITY[normalizedCategory] ?? 0;

  // Emergency flag → immediate Critical
  if (emergencyFlag) return 'Critical';

  // Location sensitivity check
  const loc = location.toLowerCase();
  const isSensitiveLocation = SENSITIVE_LOCATION_KEYWORDS.some((kw) => loc.includes(kw));
  if (isSensitiveLocation) score += 1;

  // Vote-based boost
  if (voteCount >= 50)      score += 2;
  else if (voteCount >= 20) score += 1;
  else if (voteCount >= 10) score += 0.5;

  return scoreToPriority(score);
};

module.exports = { calculatePriority };
