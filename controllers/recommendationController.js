const Recommendation = require('../models/Recommendation');
const { getRagRecommendation } = require('../services/ragRecommendationService');

// ─── Dummy fallback (legacy route POST /api/recommendations) ─
const getDummyRecommendations = (skinType) => {
  const map = {
    Dry: [
      'Hydrating Cream Cleanser',
      'Rich Moisturizing Cream',
      'Hyaluronic Acid Serum',
      'Gentle Exfoliating Toner',
      'Sunscreen SPF 30+ (moisturizing)',
    ],
    Oily: [
      'Gentle Gel Cleanser',
      'Oil-Free Moisturizer',
      'Niacinamide Serum 10%',
      'Salicylic Acid Toner',
      'Mattifying Sunscreen SPF 30+',
    ],
    Combination: [
      'Balanced Foam Cleanser',
      'Lightweight Gel Moisturizer',
      'Vitamin C Serum',
      'BHA Exfoliant (T-zone)',
      'Sunscreen SPF 30+',
    ],
    Sensitive: [
      'Fragrance-Free Gentle Cleanser',
      'Soothing Moisturizer with Ceramides',
      'Centella Asiatica Serum',
      'Alcohol-Free Toner',
      'Mineral Sunscreen SPF 30+',
    ],
  };
  return map[skinType] || map['Combination'];
};

// ─── POST /api/recommendations (legacy dummy) ─────────────────
const createRecommendation = async (req, res) => {
  try {
    const { skinType, skinConcern, ageRange, routine, allergies } = req.body;
    const userId = req.user._id;

    if (!skinType || !skinConcern || !ageRange) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const recommendedProducts = getDummyRecommendations(skinType);

    const recommendation = await Recommendation.create({
      userId,
      skinType,
      skinConcern,
      ageRange,
      routine: routine || '',
      allergies: allergies || 'None',
      recommendedProducts,
      isRag: false,
      warningMessage:
        'These are general skincare suggestions. If you have a serious or persistent skin problem, please consult a certified dermatologist.',
    });

    res.status(201).json(recommendation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/recommendations/generate-rag (real RAG) ───────
const generateRagRecommendation = async (req, res) => {
  try {
    const {
      userId,
      skinType,
      skinConcern,
      ageRange,
      routine,
      allergies,
      productType,
    } = req.body;

    // Validate required fields
    if (!skinType || !skinConcern || !ageRange) {
      return res.status(400).json({
        message: 'skinType, skinConcern, and ageRange are required.',
      });
    }

    const resolvedUserId = userId || req.user._id;

    const userProfile = {
      skinType,
      skinConcern,
      ageRange,
      routine: routine || '',
      allergies: allergies || 'None',
      productType: productType || 'skincare and makeup',
    };

    // Call RAG pipeline
    const ragResult = await getRagRecommendation(userProfile);

    // Save to MongoDB
    const recommendation = await Recommendation.create({
      userId: resolvedUserId,
      skinType,
      skinConcern,
      ageRange,
      routine: routine || '',
      allergies: allergies || 'None',
      productType: productType || 'skincare and makeup',
      isRag: true,
      summary:          ragResult.summary || '',
      skincareProducts: ragResult.skincareProducts || [],
      makeupProducts:   ragResult.makeupProducts || [],
      morningRoutine:   ragResult.routine?.morning || [],
      nightRoutine:     ragResult.routine?.night || [],
      warningMessage:   ragResult.warningMessage ||
        'These are general skincare and makeup suggestions, not medical advice. Please consult a certified dermatologist.',
    });

    res.status(201).json({
      success: true,
      recommendation: {
        _id:              recommendation._id,
        userId:           recommendation.userId,
        skinType:         recommendation.skinType,
        skinConcern:      recommendation.skinConcern,
        ageRange:         recommendation.ageRange,
        allergies:        recommendation.allergies,
        isRag:            true,
        summary:          recommendation.summary,
        skincareProducts: recommendation.skincareProducts,
        makeupProducts:   recommendation.makeupProducts,
        routine: {
          morning: recommendation.morningRoutine,
          night:   recommendation.nightRoutine,
        },
        warningMessage: recommendation.warningMessage,
        createdAt:      recommendation.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ RAG recommendation error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/recommendations/user/:userId ────────────────────
const getUserRecommendations = async (req, res) => {
  try {
    const recommendations = await Recommendation.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRecommendation, generateRagRecommendation, getUserRecommendations };
