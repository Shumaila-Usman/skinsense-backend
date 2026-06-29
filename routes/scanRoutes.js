const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const {
  analyzeScan,
  createScan,
  getUserScans,
  getScanById,
} = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');

// ─── Storage Strategy ─────────────────────────────────────────
// 1. CLOUDINARY_CLOUD_NAME set  → Cloudinary (production / Vercel / Render)
// 2. Local dev (no Cloudinary)  → disk at uploads/scans/
// 3. Serverless fallback        → memory (file passed to Roboflow, then gone)
// ─────────────────────────────────────────────────────────────
let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  // ── Cloudinary ───────────────────────────────────────────────
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'skinsense_scans',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  [{ width: 1024, crop: 'limit' }],
    },
  });

  upload = multer({ storage: cloudStorage, limits: { fileSize: 10 * 1024 * 1024 } });
  console.log('☁️  Using Cloudinary for image storage');

} else {
  // ── Try local disk, fall back to memory if read-only ─────────
  try {
    const path = require('path');
    const fs   = require('fs');

    const uploadDir = path.join(__dirname, '..', 'uploads', 'scans');
    fs.mkdirSync(uploadDir, { recursive: true });

    const diskStorage = multer.diskStorage({
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

    upload = multer({ storage: diskStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
    console.log('💾 Using local disk for image storage');

  } catch (err) {
    // Read-only filesystem (Vercel without Cloudinary) — use memory
    console.warn('⚠️  Disk not writable, falling back to memory storage. Add CLOUDINARY_* env vars for persistent image storage.');
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    });
  }
}

// ─── Routes ───────────────────────────────────────────────────
router.post('/analyze',        protect, upload.single('image'), analyzeScan);
router.post('/',               protect, createScan);
router.get('/user/:userId',    protect, getUserScans);
router.get('/:id',             protect, getScanById);

module.exports = router;
