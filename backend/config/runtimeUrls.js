const getDeploymentOrigin = () => {
  if (!process.env.VERCEL_URL) return "";
  return `https://${process.env.VERCEL_URL}`;
};

const isLocalhostUrl = (value = "") => /localhost|127\.0\.0\.1/i.test(value);

const LOCAL_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const getClientUrl = () => {
  const configured = process.env.CLIENT_URL || "";
  const deploymentOrigin = getDeploymentOrigin();

  if (deploymentOrigin && (!configured || isLocalhostUrl(configured))) {
    return deploymentOrigin;
  }

  return configured || "http://localhost:5173";
};

const getBackendUrl = () => {
  const configured = process.env.BACKEND_URL || "";
  const deploymentOrigin = getDeploymentOrigin();

  if (deploymentOrigin && (!configured || isLocalhostUrl(configured))) {
    return `${deploymentOrigin}/backend`;
  }

  return configured || "http://localhost:5000";
};

const getAllowedOrigins = () => {
  const configured = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];
  const deploymentOrigin = getDeploymentOrigin();

  return [...new Set([...LOCAL_CLIENT_ORIGINS, ...configured, deploymentOrigin].filter(Boolean))];
};

module.exports = { getClientUrl, getBackendUrl, getAllowedOrigins };
