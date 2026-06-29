/**
 * Qdrant Vector Database Service
 * Uses OpenAI embeddings (1536 dims for text-embedding-3-small)
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const { embedText, getEmbeddingDim } = require('./embeddingService');

const COLLECTION = process.env.QDRANT_COLLECTION || 'skinsense_products';

const getClient = () =>
  new QdrantClient({
    url:    process.env.QDRANT_URL    || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

// ─── Ensure collection exists with correct dimensions ─────────
const ensureCollection = async (forceRecreate = false) => {
  const client = getClient();
  const dim    = getEmbeddingDim();

  const collections = await client.getCollections();
  const existing    = collections.collections.find((c) => c.name === COLLECTION);

  if (existing) {
    if (forceRecreate) {
      console.log(`🗑️  Deleting existing collection '${COLLECTION}'...`);
      await client.deleteCollection(COLLECTION);
    } else {
      // Check dimension match
      const info = await client.getCollection(COLLECTION);
      const existingDim = info.config?.params?.vectors?.size;

      if (existingDim && existingDim !== dim) {
        console.error(`\n❌ Qdrant collection dimension mismatch!`);
        console.error(`   Collection has: ${existingDim} dims`);
        console.error(`   OpenAI model needs: ${dim} dims`);
        console.error(
          `\n   Fix: node scripts/indexProductsToQdrant.js --recreate\n`
        );
        throw new Error(
          `Qdrant collection dimension mismatch (${existingDim} vs ${dim}). ` +
          `Run: node scripts/indexProductsToQdrant.js --recreate`
        );
      }

      console.log(`✅ Qdrant collection '${COLLECTION}' exists (dim=${existingDim || dim})`);
      return;
    }
  }

  // Create fresh collection
  await client.createCollection(COLLECTION, {
    vectors: { size: dim, distance: 'Cosine' },
  });
  console.log(`✅ Qdrant collection '${COLLECTION}' created (dim=${dim})`);
};

// ─── Upsert points ────────────────────────────────────────────
const upsertPoints = async (points) => {
  const client = getClient();
  await client.upsert(COLLECTION, { points, wait: true });
};

// ─── Semantic search ──────────────────────────────────────────
const searchByText = async (queryText, topK = 10, filter = null) => {
  const client      = getClient();
  const queryVector = await embedText(queryText);

  const searchParams = {
    vector:       queryVector,
    limit:        topK,
    with_payload: true,
    with_vector:  false,
  };

  if (filter) searchParams.filter = filter;

  return client.search(COLLECTION, searchParams);
};

// ─── Delete collection ────────────────────────────────────────
const deleteCollection = async () => {
  const client = getClient();
  await client.deleteCollection(COLLECTION);
  console.log(`🗑️  Qdrant collection '${COLLECTION}' deleted`);
};

// ─── Count points ─────────────────────────────────────────────
const countPoints = async () => {
  const client = getClient();
  const info   = await client.getCollection(COLLECTION);
  return info.points_count || 0;
};

module.exports = {
  ensureCollection,
  upsertPoints,
  searchByText,
  deleteCollection,
  countPoints,
};
