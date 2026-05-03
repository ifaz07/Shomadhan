const LOCAL_API_BASE = "http://localhost:5000/api/v1";
const DEPLOYED_API_BASE = "/backend/api/v1";

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return LOCAL_API_BASE;
  }

  return DEPLOYED_API_BASE;
};

export const getAssetBaseUrl = () => getApiBaseUrl().replace("/api/v1", "");
