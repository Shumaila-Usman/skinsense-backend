/**
 * OpenAI LLM Service
 * Used for product recommendation generation via RAG
 */

const { ChatOpenAI }   = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const SYSTEM_PROMPT = `You are SkinSense AI, a skincare and makeup recommendation assistant.

Rules:
- Use ONLY the retrieved Sephora product context provided to you.
- Do NOT invent product names outside the retrieved context.
- Do NOT provide medical diagnosis.
- Avoid products that conflict with the user's allergies or sensitivities.
- If retrieved context is insufficient, say there is not enough product information.
- Return ONLY valid JSON. No markdown, no code blocks, no extra text.

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

const buildUserPrompt = (userProfile, productContext) =>
  `User Profile:
- Skin Type: ${userProfile.skinType}
- Skin Concern: ${userProfile.skinConcern}
- Age Range: ${userProfile.ageRange}
- Current Routine: ${userProfile.routine || 'Not specified'}
- Allergies/Sensitivities: ${userProfile.allergies || 'None'}
- Looking for: ${userProfile.productType || 'skincare and makeup'}

Retrieved Sephora Products (use ONLY these):
${productContext}

Provide personalized recommendations using ONLY the products above. Return valid JSON only.`;

// ─── Generate recommendation via OpenAI ──────────────────────
const generateRecommendation = async (userProfile, productContext) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is missing. Please add OPENAI_API_KEY in backend .env.'
    );
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  const llm = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName:    model,
    temperature:  0.3,
    maxTokens:    2048,
  });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(buildUserPrompt(userProfile, productContext)),
  ];

  const response = await llm.invoke(messages);
  const raw      = response.content;

  // Parse JSON — strip markdown if present
  let parsed;
  try {
    const cleaned = raw
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('❌ OpenAI non-JSON response:', raw.substring(0, 300));
    throw new Error('AI returned an invalid response format. Please try again.');
  }

  return parsed;
};

module.exports = { generateRecommendation };
