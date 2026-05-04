const getDeploymentOrigin = () => {
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.trim();
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  return "";
};

const isLocalhostUrl = (value = "") => /localhost|127\.0\.0\.1/i.test(value);

const LOCAL_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const LOCAL_BACKEND_URL = "http://localhost:5000";

const getConfiguredUrl = (value = "") => value.trim();

const getClientUrl = () => {
  const configured = getConfiguredUrl(process.env.CLIENT_URL || "");
  const deploymentOrigin = getDeploymentOrigin();

  if (deploymentOrigin && (!configured || isLocalhostUrl(configured))) {
    return configured && !isLocalhostUrl(configured)
      ? configured
      : deploymentOrigin;
  }

  return configured || "http://localhost:5173";
};

const getBackendUrl = () => {
  const configured = getConfiguredUrl(process.env.BACKEND_URL || "");
  const deploymentOrigin = getDeploymentOrigin();

  if (deploymentOrigin && (!configured || isLocalhostUrl(configured))) {
    return configured && !isLocalhostUrl(configured)
      ? configured
      : deploymentOrigin;
  }

  return configured || LOCAL_BACKEND_URL;
};

const getAllowedOrigins = () => {
  const configured = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];
  const deploymentOrigin = getDeploymentOrigin();

  return [...new Set([...LOCAL_CLIENT_ORIGINS, ...configured, deploymentOrigin].filter(Boolean))];
};

module.exports = { getClientUrl, getBackendUrl, getAllowedOrigins };
