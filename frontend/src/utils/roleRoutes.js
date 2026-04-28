export const getDefaultDashboardRoute = (role) => {
  switch (role) {
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
