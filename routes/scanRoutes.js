const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  analyzeScan,
  createScan,
  getUserScans,
  getScanById,
} = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');

// ─── Storage: Cloudinary (hosted) or local disk (development) ─
let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  // ── Production: store images on Cloudinary ──────────────────
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         'skinsense_scans',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1024, crop: 'limit' }], // resize large images
    },
  });

  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
  console.log('☁️  Using Cloudinary for image storage');

} else {
  // ── Development: store images on local disk ─────────────────
  const path = require('path');
  const fs   = require('fs');

  const uploadDir = path.join(__dirname, '..', 'uploads', 'scans');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads/scans directory');
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext    = path.extname(file.originalname) || '.jpg';
      const unique = `scan_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, unique);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, WEBP allowed.'), false);
  };

  upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
  console.log('💾 Using local disk for image storage');
}

// ─── Routes ───────────────────────────────────────────────────
router.post('/analyze', protect, upload.single('image'), analyzeScan);
router.post('/',        protect, createScan);
router.get('/user/:userId', protect, getUserScans);
router.get('/:id',          protect, getScanById);

module.exports = router;
