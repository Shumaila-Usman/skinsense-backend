/**
 * RAG Recommendation Service
 * Pipeline: Qdrant semantic search → product context → OpenAI LLM → JSON
 * Fallback: Groq (if GROQ_API_KEY is set and OpenAI fails)
 */

const { searchByText }       = require('./qdrantService');
const { generateRecommendation: openaiGenerate } = require('./openaiService');

// ─── Optional Groq fallback ───────────────────────────────────
let groqGenerate = null;
try {
  groqGenerate = require('./groqService').generateRecommendation;
} catch {
  // groqService not available — fine
}

// ─── Build retrieval query ────────────────────────────────────
const buildRetrievalQuery = (profile) => {
  const parts = [
    `${profile.skinType} skin`,
    profile.skinConcern,
    profile.ageRange ? `age ${profile.ageRange}` : '',
    profile.productType || 'skincare makeup',
  ].filter(Boolean);

  if (profile.allergies && profile.allergies.toLowerCase() !== 'none') {
    parts.push('fragrance free gentle');
  }

  return parts.join(' ');
};

// ─── Format retrieved products as LLM context ─────────────────
const buildProductContext = (results) => {
  if (!results || results.length === 0) {
    return 'No relevant products found in the knowledge base.';
  }

  return results
    .map((r, i) => {
      const p         = r.payload;
      const price     = p.priceUsd ? `$${p.priceUsd}` : 'Price not available';
      const rating    = p.rating   ? `Rating: ${p.rating}/5` : '';
      const category  = [p.primaryCategory, p.secondaryCategory, p.tertiaryCategory]
        .filter(Boolean).join(' > ');
      const highlights   = p.highlights   ? `Highlights: ${p.highlights}` : '';
      const ingredients  = p.ingredients
        ? `Key ingredients: ${p.ingredients.substring(0, 200)}...`
        : '';

      return `Product ${i + 1}:
Name: ${p.productName}
Brand: ${p.brandName}
Price: ${price}
${rating}
Category: ${category}
${highlights}
${ingredients}
---`;
    })
    .join('\n');
};

// ─── Main RAG function ────────────────────────────────────────
const getRagRecommendation = async (userProfile) => {
  console.log(`🔍 RAG query for: ${userProfile.skinType} skin — "${userProfile.skinConcern}"`);

  const query = buildRetrievalQuery(userProfile);
  console.log(`📝 Vector query: "${query}"`);

  // 1. Qdrant semantic search
  let searchResults;
  try {
    const filter = {
      must: [{ key: 'outOfStock', match: { value: false } }],
    };
    searchResults = await searchByText(query, 12, filter);
    console.log(`✅ Retrieved ${searchResults.length} products from Qdrant`);
  } catch (err) {
    console.error('❌ Qdrant error:', err.message);
    throw new Error('Product search service is temporarily unavailable. Please try again.');
  }

  // 2. Allergy filter (best-effort)
  let filtered = searchResults;
  if (userProfile.allergies && userProfile.allergies.toLowerCase() !== 'none') {
    const terms = userProfile.allergies
      .toLowerCase()
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const allergyFiltered = searchResults.filter((r) => {
      const text = [r.payload.ingredients || '', r.payload.highlights || '']
        .join(' ')
        .toLowerCase();
      return !terms.some((t) => text.includes(t));
    });

    filtered = allergyFiltered.length >= 4 ? allergyFiltered : searchResults;
    if (allergyFiltered.length < 4) {
      console.log('⚠️  Allergy filter too strict — using original results');
    }
  }

  // 3. Build context string
  const productContext = buildProductContext(filtered);

  // 4. Call OpenAI (primary), fallback to Groq
  console.log('🤖 Calling OpenAI for recommendation generation...');
  try {
    const result = await openaiGenerate(userProfile, productContext);
    console.log('✅ OpenAI recommendation generated');
    return result;
  } catch (openaiErr) {
    console.error('❌ OpenAI failed:', openaiErr.message);

    // Try Groq fallback if configured
    if (groqGenerate && process.env.GROQ_API_KEY) {
      console.log('⚠️  Falling back to Groq...');
      try {
        const result = await groqGenerate(userProfile, productContext);
        console.log('✅ Groq fallback succeeded');
        return result;
      } catch (groqErr) {
        console.error('❌ Groq fallback also failed:', groqErr.message);
      }
    }

    // Re-throw the OpenAI error
    throw new Error(
      openaiErr.message.includes('API key')
        ? openaiErr.message
        : 'AI recommendation service is temporarily unavailable. Please try again.'
    );
  }
};

module.exports = { getRagRecommendation };
