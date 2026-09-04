const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fromFile } = require('file-type');
const { upload: cfg } = require('../config/security');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'signatures'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `signature-${unique}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  if (!cfg.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PNG, JPG, and WEBP images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: cfg.maxFileSize },
});

// Multer's fileFilter only trusts the client-declared mimetype. This checks the
// file's actual magic bytes after it's written to disk, and deletes it if the real
// content doesn't match an allowed image type (blocks a renamed .html/.svg/.exe etc).
function verifyMagicBytes() {
  return async (req, res, next) => {
    if (!req.file) return next();
    try {
      const type = await fromFile(req.file.path);
      if (!type || !cfg.allowedExtensions.includes(type.ext)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: 'File content does not match an allowed image type' });
      }
      next();
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      next(err);
    }
  };
}

module.exports = upload;
module.exports.verifyMagicBytes = verifyMagicBytes;
