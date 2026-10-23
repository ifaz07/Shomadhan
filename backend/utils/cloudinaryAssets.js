const cloudinary = require("../config/cloudinary");

const CLOUDINARY_URL_PATTERN =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+)$/i;

// Extracts { publicId, resourceType } from a Cloudinary delivery URL.
// Returns null for anything that is not a Cloudinary URL (e.g. legacy local paths).
const parseCloudinaryUrl = (url) => {
  const match = CLOUDINARY_URL_PATTERN.exec(String(url || "").split("?")[0]);
  if (!match) return null;

  const resourceType = match[1].toLowerCase();
  const rest = match[2];
  const format = (rest.match(/\.([^./]+)$/) || [])[1] || "";
  // Raw assets keep their extension in the public id; image/video do not.
  const publicId = resourceType === "raw" ? rest : rest.replace(/\.[^./]+$/, "");

  return { publicId: decodeURIComponent(publicId), resourceType, format: format.toLowerCase() };
};

// Signed, short-lived Admin API download link. Unlike the public delivery URL it
// keeps working when the account restricts delivery of PDFs.
const getCloudinaryDownloadUrl = (url) => {
  const asset = parseCloudinaryUrl(url);
  if (!asset || !asset.format) return null;

  return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "upload",
  });
};

// Best-effort delete; a failed cleanup must never block the main operation.
const destroyCloudinaryAsset = async (url) => {
  const asset = parseCloudinaryUrl(url);
  if (!asset) return false;

  try {
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true,
    });
    return true;
  } catch (error) {
    console.warn(`[Cloudinary Cleanup] Failed to delete ${asset.publicId}:`, error.message);
    return false;
  }
};

module.exports = { parseCloudinaryUrl, getCloudinaryDownloadUrl, destroyCloudinaryAsset };
