export const DEPARTMENT_OPTIONS = [
  { value: "public_works", label: "Public Works" },
  { value: "water_authority", label: "Water Authority" },
  { value: "electricity", label: "Electricity Dept" },
  { value: "sanitation", label: "Sanitation Dept" },
  { value: "public_safety", label: "Public Safety Dept" },
  { value: "animal_control", label: "Animal Control" },
  { value: "health", label: "Health Dept" },
  { value: "transport", label: "Transport Dept" },
  { value: "environment", label: "Environment Dept" },
  { value: "police", label: "Police Department" },
];

export const DEPARTMENT_LABELS = DEPARTMENT_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const LEGACY_CATEGORY_TO_DEPARTMENT = {
  Road: "public_works",
  Waste: "sanitation",
  Electricity: "electricity",
  Water: "water_authority",
  Safety: "public_safety",
  Environment: "environment",
  "Law Enforcement": "police",
  Other: null,
};

export const normalizeDepartmentValue = (value) => {
  if (!value) return null;
  if (DEPARTMENT_LABELS[value]) return value;
  return LEGACY_CATEGORY_TO_DEPARTMENT[value] || null;
};

export const getDepartmentLabel = (value) => {
  const normalized = normalizeDepartmentValue(value);
  return (normalized && DEPARTMENT_LABELS[normalized]) || value || "";
};
