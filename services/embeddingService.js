/**
 * Embedding Service — OpenAI default
 * Uses text-embedding-3-small (1536 dimensions)
 * Groq/HuggingFace are NOT used here.
 */

const axios = require('axios');

// text-embedding-3-small = 1536 dims
// text-embedding-3-large = 3072 dims
// text-embedding-ada-002 = 1536 dims
const OPENAI_DIM = 1536;

const getModel = () =>
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

const getApiKey = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'OpenAI API key is missing. Please add OPENAI_API_KEY in backend .env.'
    );
  }
  return key;
};

// ─── Single text embedding ────────────────────────────────────
const embedText = async (text) => {
  const apiKey = getApiKey();
  const model  = getModel();

  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: text, model },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.data[0].embedding;
};

// ─── Batch embedding ──────────────────────────────────────────
const embedBatch = async (texts) => {
  const apiKey = getApiKey();
  const model  = getModel();

  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: texts, model },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  // OpenAI returns results sorted by index
  return response.data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
};

// ─── Embedding dimension ──────────────────────────────────────
const getEmbeddingDim = () => OPENAI_DIM;

module.exports = { embedText, embedBatch, getEmbeddingDim };
