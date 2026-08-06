export const normalizeRole = (role) => {
  const normalized = String(role || "").toLowerCase().trim();

  if (["department_officer", "department-officer", "public_servant", "public-servant", "servant", "officer"].includes(normalized)) {
    return "department_officer";
  }

  if (["admin", "system_admin"].includes(normalized)) {
    return "admin";
  }

  if (["mayor", "city_mayor"].includes(normalized)) {
    return "mayor";
  }

  return normalized || "citizen";
};

export const getDefaultDashboardRoute = (role) => {
  switch (normalizeRole(role)) {
    case "department_officer":
      return "/servant/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "mayor":
      return "/mayor/dashboard";
    default:
      return "/dashboard";
  }
};
