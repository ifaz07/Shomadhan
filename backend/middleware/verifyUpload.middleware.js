const multer = require('multer');
const { randomUUID } = require('crypto');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Verification files must outlive backend restarts and redeployments.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'shomadhan/verification',
    resource_type: 'auto',
    public_id: (req) => `verification-${req.user.id}-${randomUUID()}`,
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed for verification.'), false);
  }
};

const verifyUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = verifyUpload;
