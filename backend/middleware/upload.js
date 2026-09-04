const multer = require('multer');
const path = require('path');

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'signatures'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `signature-${unique}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new Error('Only PNG, JPG, and WEBP images are allowed'));
  }
  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
