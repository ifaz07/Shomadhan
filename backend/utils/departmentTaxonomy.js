const DEPARTMENT_OPTIONS = [
  { key: "animal_control", label: "Animal Control" },
  { key: "civil_works", label: "Civil Works" },
  { key: "electricity", label: "Electricity Department" },
  { key: "environment", label: "Environment Department" },
  { key: "fire_service", label: "Fire Service" },
  { key: "health", label: "Health Department" },
  { key: "police", label: "Police Department" },
  { key: "sanitation", label: "Sanitation Department" },
  { key: "transport", label: "Transport Department" },
  { key: "water_authority", label: "Water Authority" },
];

const DEPARTMENT_KEYS = DEPARTMENT_OPTIONS.map((item) => item.key);

const DEPARTMENT_LABELS = DEPARTMENT_OPTIONS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const LEGACY_CATEGORY_TO_DEPARTMENT = {
  Road: "civil_works",
  Waste: "sanitation",
  Electricity: "electricity",
  Water: "water_authority",
  Safety: "police",
  Environment: "environment",
  "Law Enforcement": "police",
  Other: null,
};

const DEPARTMENT_COMPATIBILITY = {
  civil_works: ["civil_works", "public_works", "Road"],
  water_authority: ["water_authority", "Water"],
  electricity: ["electricity", "Electricity"],
  sanitation: ["sanitation", "Waste"],
  animal_control: ["animal_control"],
  health: ["health", "Other"],
  transport: ["transport"],
  environment: ["environment", "Environment"],
  police: ["police", "Law Enforcement", "Safety"],
  fire_service: ["fire_service"],
};

const normalizeDepartmentKey = (value) => {
  if (!value) return null;
  if (DEPARTMENT_KEYS.includes(value)) return value;
  return LEGACY_CATEGORY_TO_DEPARTMENT[value] || null;
};

const getDepartmentLabel = (value) => {
  const key = normalizeDepartmentKey(value);
  return (key && DEPARTMENT_LABELS[key]) || value || "";
};

const getDepartmentComplaintValues = (departmentKey) => {
  return DEPARTMENT_COMPATIBILITY[departmentKey] || [];
};

module.exports = {
  DEPARTMENT_OPTIONS,
  DEPARTMENT_KEYS,
  DEPARTMENT_LABELS,
  LEGACY_CATEGORY_TO_DEPARTMENT,
  DEPARTMENT_COMPATIBILITY,
  normalizeDepartmentKey,
  getDepartmentLabel,
  getDepartmentComplaintValues,
};
