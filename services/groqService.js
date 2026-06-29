/**
 * Groq LLM Service
 * Uses LangChain ChatGroq to generate structured JSON recommendations
 */

const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const SYSTEM_PROMPT = `You are SkinSense AI, a professional skincare and makeup recommendation assistant.

Rules:
- Use ONLY the retrieved Sephora product context provided to you.
- Do NOT invent product names that are not in the retrieved context.
- Do NOT provide any medical diagnosis.
- Avoid recommending products that conflict with the user's stated allergies or sensitivities.
- If retrieved context is insufficient to make a recommendation, say so honestly.
- Return ONLY valid JSON. No extra text, no markdown, no code blocks.

Return this exact JSON structure:
{
  "summary": "Brief 2-3 sentence personalized overview",
  "skincareProducts": [
    {
      "name": "exact product name from context",
      "brand": "brand name",
      "priceUsd": "$XX.XX",
      "reason": "why this suits the user",
      "howToUse": "application instructions",
      "caution": "any caution or empty string"
    }
  ],
  "makeupProducts": [
    {
      "name": "exact product name from context",
      "brand": "brand name",
      "priceUsd": "$XX.XX",
      "reason": "why this suits the user",
      "howToUse": "application instructions",
      "caution": "any caution or empty string"
    }
  ],
  "routine": {
    "morning": ["step 1", "step 2"],
    "night": ["step 1", "step 2"]
  },
  "warningMessage": "These are general skincare and makeup suggestions, not medical advice. Please consult a certified dermatologist for serious, worsening, or persistent symptoms."
}`;

// ─── Build user prompt ────────────────────────────────────────
const buildUserPrompt = (userProfile, productContext) => {
  return `User Profile:
- Skin Type: ${userProfile.skinType}
- Skin Concern: ${userProfile.skinConcern}
- Age Range: ${userProfile.ageRange}
- Current Routine: ${userProfile.routine || 'Not specified'}
- Allergies/Sensitivities: ${userProfile.allergies || 'None'}
- Looking for: ${userProfile.productType || 'skincare and makeup'}

Retrieved Sephora Products (use ONLY these):
${productContext}

Based on the user profile and ONLY the products listed above, provide personalized skincare and makeup recommendations. Return valid JSON only.`;
};

// ─── Generate recommendation via Groq ────────────────────────
const generateRecommendation = async (userProfile, productContext) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured. Please add it to your .env file.');
  }

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const llm = new ChatGroq({
    apiKey,
    model,
    temperature: 0.3,
    maxTokens: 2048,
  });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(buildUserPrompt(userProfile, productContext)),
  ];

  const response = await llm.invoke(messages);
  const raw = response.content;

  // ─── Parse JSON safely ────────────────────────────────────
  let parsed;
  try {
    // Strip markdown code blocks if present
    const cleaned = raw
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('❌ Groq returned non-JSON:', raw.substring(0, 300));
    throw new Error('AI returned an invalid response format. Please try again.');
  }

  return parsed;
};

module.exports = { generateRecommendation };
