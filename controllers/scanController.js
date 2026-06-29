/**
 * Scan Controller
 * - Disease detection: Roboflow (or dummy if USE_DUMMY_SCAN=true)
 * - Cure suggestion:   OpenAI (falls back to static mapping)
 */

const ScanHistory           = require('../models/ScanHistory');
const { getCureSuggestion } = require('../services/cureSuggestionService');

// ─── Dummy fallback ───────────────────────────────────────────
const getDummyDiagnosis = () => {
  const options = [
    { name: 'Acne',      confidence: 94 },
    { name: 'Eczema',    confidence: 89 },
    { name: 'Psoriasis', confidence: 87 },
    { name: 'Ringworm',  confidence: 91 },
  ];
  return options[Math.floor(Math.random() * options.length)];
};

// ─── Lazy-load detection service based on provider ───────────
const getDetectionService = () => {
  const provider = (process.env.SKIN_MODEL_PROVIDER || 'roboflow').toLowerCase();
  if (provider === 'roboflow') {
    return require('../services/roboflowSkinService');
  }
  // HuggingFace kept as optional legacy
  return require('../services/huggingFaceSkinService');
};

// ─── POST /api/scans/analyze ──────────────────────────────────
const analyzeScan = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a skin image.' });
    }

    const imagePath = req.file.path;

    // Cloudinary returns a full URL; local disk returns a file path
    const imageRelative = req.file.path?.startsWith('http')
      ? req.file.path                              // Cloudinary URL
      : '/uploads/scans/' + req.file.filename;     // local path

    let detectedDisease, confidence;

    // ── Disease detection ────────────────────────────────────
    if (process.env.USE_DUMMY_SCAN === 'true') {
      console.log('⚠️  USE_DUMMY_SCAN=true — skipping real detection');
      const dummy  = getDummyDiagnosis();
      detectedDisease = dummy.name;
      confidence      = dummy.confidence;
    } else {
      console.log(`🔬 Detecting disease (provider: ${process.env.SKIN_MODEL_PROVIDER || 'roboflow'})`);
      const service = getDetectionService();
      const result  = await service.analyzeSkinImage(imagePath);
      detectedDisease = result.detectedDisease;
      confidence      = result.confidence;

      if (result.belowThreshold) {
        console.log(`⚠️  Low confidence result — flagged as unclear`);
      } else {
        console.log(`✅ Detection: ${detectedDisease} (${confidence}%)`);
      }
    }

    // ── Cure suggestion (OpenAI → static fallback) ───────────
    // For low-confidence / unclear results, skip OpenAI and use safe defaults
    console.log('💊 Getting cure suggestion...');
    let treatment, disclaimer;

    if (detectedDisease === 'No clear disease detected') {
      const { getStaticTreatment, DISCLAIMER } = require('../services/cureSuggestionService');
      treatment  = getStaticTreatment('unknown');
      disclaimer = DISCLAIMER;
    } else {
      const result = await getCureSuggestion(detectedDisease, confidence);
      treatment    = result.treatment;
      disclaimer   = result.disclaimer;
    }

    // ── Save to MongoDB ──────────────────────────────────────
    const scan = await ScanHistory.create({
      userId,
      image:           imageRelative,
      detectedDisease,
      confidence:      `${confidence}%`,
      treatment:       treatment.join('. '),
    });

    // ── Return response ──────────────────────────────────────
    res.status(201).json({
      success: true,
      scan: {
        _id:             scan._id,
        userId:          scan.userId,
        image:           scan.image,
        detectedDisease: scan.detectedDisease,
        confidence:      scan.confidence,
        treatment,           // array for frontend display
        disclaimer,
        createdAt:       scan.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Scan error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/scans (legacy dummy route) ────────────────────
const createScan = async (req, res) => {
  try {
    const { image } = req.body;
    const userId    = req.user._id;
    const dummy     = getDummyDiagnosis();
    const { treatment, disclaimer } = await getCureSuggestion(dummy.name, dummy.confidence);

    const scan = await ScanHistory.create({
      userId,
      image:           image || 'scan_placeholder.jpg',
      detectedDisease: dummy.name,
      treatment:       treatment.join('. '),
      confidence:      `${dummy.confidence}%`,
    });

    res.status(201).json(scan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/scans/user/:userId ──────────────────────────────
const getUserScans = async (req, res) => {
  try {
    const scans = await ScanHistory.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/scans/:id ───────────────────────────────────────
const getScanById = async (req, res) => {
  try {
    const scan = await ScanHistory.findById(req.params.id)
      .populate('userId', 'fullName email');
    if (!scan) return res.status(404).json({ message: 'Scan not found' });
    res.json(scan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { analyzeScan, createScan, getUserScans, getScanById };
