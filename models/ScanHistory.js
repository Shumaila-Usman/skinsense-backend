const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    image: {
      type: String,
      default: 'placeholder_image.jpg',
    },
    detectedDisease: {
      type: String,
      required: true,
    },
    treatment: {
      type: String,
      required: true,
    },
    confidence: {
      type: String,
      default: '92%',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
