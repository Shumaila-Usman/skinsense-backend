/**
 * Import products from product_info.csv into MongoDB
 * Run: node scripts/importProductsFromCSV.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const CSV_PATH = path.join(__dirname, '..', 'data', 'product_info.csv');

// ─── Safe number conversion ───────────────────────────────────
const toNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// ─── Safe boolean conversion ──────────────────────────────────
const toBool = (val) => {
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
};

// ─── Build searchable text ────────────────────────────────────
const buildSearchableText = (row) => {
  return [
    row.product_name,
    row.brand_name,
    row.highlights,
    row.primary_category,
    row.secondary_category,
    row.tertiary_category,
    row.ingredients ? row.ingredients.substring(0, 500) : '',
    row.size,
    row.price_usd ? `$${row.price_usd}` : '',
    row.rating ? `rating ${row.rating}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ─── Main import function ─────────────────────────────────────
const importProducts = async () => {
  // Check CSV file exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found at: ${CSV_PATH}`);
    console.error('   Please place product_info.csv in backend/data/');
    process.exit(1);
  }

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const stats = { imported: 0, updated: 0, skipped: 0, errors: 0 };
  const rows = [];

  // Read CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📄 Read ${rows.length} rows from CSV`);
  console.log('⏳ Importing to MongoDB...\n');

  for (const row of rows) {
    try {
      // Skip if required fields missing
      if (!row.product_name?.trim() || !row.brand_name?.trim() || !row.primary_category?.trim()) {
        stats.skipped++;
        continue;
      }

      // Skip if no product_id
      if (!row.product_id?.trim()) {
        stats.skipped++;
        continue;
      }

      const doc = {
        productId:            row.product_id.trim(),
        productName:          row.product_name.trim(),
        brandId:              row.brand_id?.trim() || '',
        brandName:            row.brand_name.trim(),
        lovesCount:           toNum(row.loves_count),
        rating:               toNum(row.rating),
        reviewsCount:         toNum(row.reviews),
        size:                 row.size?.trim() || '',
        variationType:        row.variation_type?.trim() || '',
        variationValue:       row.variation_value?.trim() || '',
        variationDescription: row.variation_desc?.trim() || '',
        ingredients:          row.ingredients?.trim() || '',
        priceUsd:             toNum(row.price_usd),
        valuePriceUsd:        toNum(row.value_price_usd),
        salePriceUsd:         toNum(row.sale_price_usd),
        limitedEdition:       toBool(row.limited_edition),
        isNewProduct:         toBool(row.new),
        onlineOnly:           toBool(row.online_only),
        outOfStock:           toBool(row.out_of_stock),
        sephoraExclusive:     toBool(row.sephora_exclusive),
        highlights:           row.highlights?.trim() || '',
        primaryCategory:      row.primary_category.trim(),
        secondaryCategory:    row.secondary_category?.trim() || '',
        tertiaryCategory:     row.tertiary_category?.trim() || '',
        childCount:           toNum(row.child_count),
        childMaxPrice:        toNum(row.child_max_price),
        childMinPrice:        toNum(row.child_min_price),
        searchableText:       buildSearchableText(row),
        rawData:              row,
      };

      // Upsert by productId
      const existing = await Product.findOne({ productId: doc.productId });
      if (existing) {
        await Product.updateOne({ productId: doc.productId }, { $set: doc });
        stats.updated++;
      } else {
        await Product.create(doc);
        stats.imported++;
      }

      // Progress log every 500 records
      const total = stats.imported + stats.updated + stats.skipped + stats.errors;
      if (total % 500 === 0) {
        process.stdout.write(`\r  Progress: ${total}/${rows.length} rows processed...`);
      }
    } catch (err) {
      stats.errors++;
      if (stats.errors <= 5) {
        console.error(`\n❌ Error on product_id=${row.product_id}: ${err.message}`);
      }
    }
  }

  console.log('\n\n─── Import Summary ───────────────────────────');
  console.log(`✅ Imported (new):  ${stats.imported}`);
  console.log(`🔄 Updated:        ${stats.updated}`);
  console.log(`⏭️  Skipped:        ${stats.skipped}`);
  console.log(`❌ Errors:         ${stats.errors}`);
  console.log(`📦 Total in DB:    ${await Product.countDocuments()}`);
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✅ Done. MongoDB disconnected.');
};

importProducts().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
