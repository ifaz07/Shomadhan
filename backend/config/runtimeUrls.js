const getDeploymentOrigin = () => {
  if (!process.env.VERCEL_URL) return "";
  return `https://${process.env.VERCEL_URL}`;
};

const isLocalhostUrl = (value = "") => /localhost|127\.0\.0\.1/i.test(value);

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

  return configured || "http://localhost:5001";
};

module.exports = { getClientUrl, getBackendUrl };
