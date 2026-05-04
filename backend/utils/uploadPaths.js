const fs = require("fs");
const path = require("path");

const getUploadBaseDir = () => {
  const configuredDir = process.env.UPLOAD_ROOT_DIR?.trim();
  if (configuredDir) {
    return path.resolve(configuredDir);
  }

  return path.join(__dirname, "..", "uploads");
};

const getUploadDir = (folderName) => {
  const uploadDir = path.join(getUploadBaseDir(), folderName);
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};

module.exports = { getUploadBaseDir, getUploadDir };
