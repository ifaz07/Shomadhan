const multer = require('multer');
const { randomUUID } = require('crypto');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Handles complaint photos, videos, and audio, plus emergency audio.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'shomadhan/evidence',
    resource_type: 'auto',
    public_id: (req, file) => `${file.fieldname}-${req.user.id}-${randomUUID()}`,
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
  ];

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    file.mimetype?.startsWith('image/') ||
    file.mimetype?.startsWith('video/') ||
    file.mimetype?.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and audio are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});

module.exports = upload;
