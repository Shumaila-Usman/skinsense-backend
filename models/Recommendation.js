const mongoose = require('mongoose');

const productItemSchema = new mongoose.Schema({
  name:     { type: String, default: '' },
  brand:    { type: String, default: '' },
  priceUsd: { type: String, default: '' },
  reason:   { type: String, default: '' },
  howToUse: { type: String, default: '' },
  caution:  { type: String, default: '' },
}, { _id: false });

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skinType:    { type: String, required: true },
    skinConcern: { type: String, required: true },
    ageRange:    { type: String, required: true },
    routine:     { type: String, default: '' },
    allergies:   { type: String, default: 'None' },
    productType: { type: String, default: 'skincare and makeup' },

    // Legacy field (dummy recommendations)
    recommendedProducts: { type: [String], default: [] },

    // RAG fields
    isRag:            { type: Boolean, default: false },
    summary:          { type: String, default: '' },
    skincareProducts: { type: [productItemSchema], default: [] },
    makeupProducts:   { type: [productItemSchema], default: [] },
    morningRoutine:   { type: [String], default: [] },
    nightRoutine:     { type: [String], default: [] },

    warningMessage: {
      type: String,
      default:
        'These are general skincare and makeup suggestions, not medical advice. Please consult a certified dermatologist for serious, worsening, or persistent symptoms.',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recommendation', recommendationSchema);
