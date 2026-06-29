const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  analyzeScan,
  createScan,
  getUserScans,
  getScanById,
} = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');

// ─── Ensure uploads/scans directory exists ────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'scans');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads/scans directory');
}

// ─── Multer storage config ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `scan_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ─── Routes ───────────────────────────────────────────────────

// NEW: Real AI scan route — accepts multipart/form-data image
router.post('/analyze', protect, upload.single('image'), analyzeScan);

// Legacy: JSON body scan (kept for backward compatibility)
router.post('/', protect, createScan);

// Existing routes
router.get('/user/:userId', protect, getUserScans);
router.get('/:id', protect, getScanById);

module.exports = router;
