const DEPARTMENT_OPTIONS = [
  { key: "public_works", label: "Public Works" },
  { key: "water_authority", label: "Water Authority" },
  { key: "electricity", label: "Electricity Dept" },
  { key: "sanitation", label: "Sanitation Dept" },
  { key: "public_safety", label: "Public Safety Dept" },
  { key: "animal_control", label: "Animal Control" },
  { key: "health", label: "Health Dept" },
  { key: "transport", label: "Transport Dept" },
  { key: "environment", label: "Environment Dept" },
  { key: "police", label: "Police Department" },
];

const DEPARTMENT_KEYS = DEPARTMENT_OPTIONS.map((item) => item.key);

const DEPARTMENT_LABELS = DEPARTMENT_OPTIONS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const LEGACY_CATEGORY_TO_DEPARTMENT = {
  Road: "public_works",
  Waste: "sanitation",
  Electricity: "electricity",
  Water: "water_authority",
  Safety: "public_safety",
  Environment: "environment",
  "Law Enforcement": "police",
  Other: null,
};

const DEPARTMENT_COMPATIBILITY = {
  public_works: ["public_works", "Road"],
  water_authority: ["water_authority", "Water"],
  electricity: ["electricity", "Electricity"],
  sanitation: ["sanitation", "Waste"],
  public_safety: ["public_safety", "Safety"],
  animal_control: ["animal_control"],
  health: ["health", "Other"],
  transport: ["transport"],
  environment: ["environment", "Environment"],
  police: ["police", "Law Enforcement"],
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
