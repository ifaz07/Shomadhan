export const DEPARTMENT_OPTIONS = [
  { value: "animal_control", label: "Animal Control" },
  { value: "civil_works", label: "Civil Works" },
  { value: "electricity", label: "Electricity Department" },
  { value: "environment", label: "Environment Department" },
  { value: "fire_service", label: "Fire Service" },
  { value: "health", label: "Health Department" },
  { value: "police", label: "Police Department" },
  { value: "sanitation", label: "Sanitation Department" },
  { value: "transport", label: "Transport Department" },
  { value: "water_authority", label: "Water Authority" },
];

export const DEPARTMENT_LABELS = DEPARTMENT_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const LEGACY_CATEGORY_TO_DEPARTMENT = {
  Road: "civil_works",
  Waste: "sanitation",
  Electricity: "electricity",
  Water: "water_authority",
  Safety: "police",
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
