const express = require('express');
const router = express.Router();
const {
  createRecommendation,
  generateRagRecommendation,
  getUserRecommendations,
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

// RAG-powered recommendation (real AI + Sephora products)
router.post('/generate-rag', protect, generateRagRecommendation);

// Legacy dummy recommendation
router.post('/', protect, createRecommendation);

// Get user's recommendation history
router.get('/user/:userId', protect, getUserRecommendations);

module.exports = router;
