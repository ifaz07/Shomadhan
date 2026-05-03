const fs = require("fs");
const os = require("os");
const path = require("path");

const getUploadDir = (folderName) => {
  const baseDir =
    process.env.VERCEL || process.env.NODE_ENV === "production"
      ? path.join(os.tmpdir(), "shomadhan-uploads")
      : path.join(__dirname, "..", "uploads");

  const uploadDir = path.join(baseDir, folderName);
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};

module.exports = { getUploadDir };
