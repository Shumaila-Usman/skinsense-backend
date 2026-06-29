/**
 * Index products from MongoDB into Qdrant
 * Uses OpenAI embeddings (text-embedding-3-small, 1536 dims)
 *
 * Usage:
 *   node scripts/indexProductsToQdrant.js            ← normal run
 *   node scripts/indexProductsToQdrant.js --recreate  ← delete & rebuild collection
 *
 * Prerequisites:
 *   1. docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
 *   2. node scripts/importProductsFromCSV.js
 *   3. OPENAI_API_KEY set in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose  = require('mongoose');
const Product   = require('../models/Product');
const { ensureCollection, upsertPoints, countPoints } = require('../services/qdrantService');
const { embedBatch, getEmbeddingDim }                 = require('../services/embeddingService');

const BATCH_SIZE  = 20;   // OpenAI handles batches well
const RECREATE    = process.argv.includes('--recreate');

// ─── Stable numeric ID from productId string ─────────────────
const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash = hash & hash;
  }
  return Math.abs(hash) || 1;
};

const indexProducts = async () => {
  if (RECREATE) {
    console.log('⚠️  --recreate flag detected: will delete and recreate collection\n');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const totalInDB = await Product.countDocuments();
  console.log(`📦 Total products in MongoDB: ${totalInDB}`);

  const products = await Product.find({
    outOfStock:     false,
    searchableText: { $ne: '' },
  }).select(
    'productId productName brandName rating priceUsd ' +
    'primaryCategory secondaryCategory tertiaryCategory ' +
    'ingredients highlights outOfStock searchableText'
  );

  console.log(`🔍 Products to index (in-stock): ${products.length}`);

  if (products.length === 0) {
    console.log('⚠️  No products found. Run importProductsFromCSV.js first.');
    process.exit(0);
  }

  console.log(`\n📡 Connecting to Qdrant (dim=${getEmbeddingDim()})...`);
  await ensureCollection(RECREATE);

  const existingCount = await countPoints();
  console.log(`📊 Existing Qdrant points: ${existingCount}`);

  let indexed = 0;
  let errors  = 0;

  console.log(`\n⏳ Indexing in batches of ${BATCH_SIZE} (OpenAI embeddings)...\n`);

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const texts = batch.map((p) => p.searchableText);

    try {
      const embeddings = await embedBatch(texts);

      const points = batch.map((product, j) => ({
        id:      hashCode(product.productId),
        vector:  embeddings[j],
        payload: {
          productId:         product.productId,
          productName:       product.productName,
          brandName:         product.brandName,
          rating:            product.rating    || 0,
          priceUsd:          product.priceUsd  || 0,
          primaryCategory:   product.primaryCategory   || '',
          secondaryCategory: product.secondaryCategory || '',
          tertiaryCategory:  product.tertiaryCategory  || '',
          ingredients:       (product.ingredients || '').substring(0, 500),
          highlights:        product.highlights  || '',
          outOfStock:        product.outOfStock  || false,
        },
      }));

      await upsertPoints(points);
      indexed += batch.length;
      process.stdout.write(`\r  Progress: ${indexed}/${products.length} indexed...`);

      // Small delay to avoid OpenAI rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      errors += batch.length;
      console.error(`\n❌ Batch error at index ${i}: ${err.message}`);
      if (err.message.includes('API key')) {
        console.error('   → Make sure OPENAI_API_KEY is set in .env');
        break;
      }
    }
  }

  const finalCount = await countPoints();

  console.log('\n\n─── Indexing Summary ─────────────────────────');
  console.log(`✅ Products indexed: ${indexed}`);
  console.log(`❌ Errors:          ${errors}`);
  console.log(`📊 Qdrant total:    ${finalCount} points`);
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✅ Done.');
};

indexProducts().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
