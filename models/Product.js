const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId:            { type: String, required: true, unique: true, index: true },
    productName:          { type: String, required: true },
    brandId:              { type: String, default: '' },
    brandName:            { type: String, default: '' },
    lovesCount:           { type: Number, default: 0 },
    rating:               { type: Number, default: 0 },
    reviewsCount:         { type: Number, default: 0 },
    size:                 { type: String, default: '' },
    variationType:        { type: String, default: '' },
    variationValue:       { type: String, default: '' },
    variationDescription: { type: String, default: '' },
    ingredients:          { type: String, default: '' },
    priceUsd:             { type: Number, default: 0 },
    valuePriceUsd:        { type: Number, default: 0 },
    salePriceUsd:         { type: Number, default: 0 },
    limitedEdition:       { type: Boolean, default: false },
    isNewProduct:         { type: Boolean, default: false },
    onlineOnly:           { type: Boolean, default: false },
    outOfStock:           { type: Boolean, default: false },
    sephoraExclusive:     { type: Boolean, default: false },
    highlights:           { type: String, default: '' },
    primaryCategory:      { type: String, default: '' },
    secondaryCategory:    { type: String, default: '' },
    tertiaryCategory:     { type: String, default: '' },
    childCount:           { type: Number, default: 0 },
    childMaxPrice:        { type: Number, default: 0 },
    childMinPrice:        { type: Number, default: 0 },
    // Full-text search field built from key columns
    searchableText:       { type: String, default: '' },
    // Original CSV row for reference
    rawData:              { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Text index for fallback search
productSchema.index({ searchableText: 'text', productName: 'text', brandName: 'text' });

module.exports = mongoose.model('Product', productSchema);
