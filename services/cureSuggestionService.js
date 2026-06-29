/**
 * Cure Suggestion Service
 * Uses OpenAI to generate educational treatment suggestions.
 * Falls back to static mapping if OpenAI fails or is not configured.
 */

const axios = require('axios');

const DISCLAIMER =
  'This result is AI-assisted and for educational purposes only. It is not a medical diagnosis. ' +
  'Please consult a certified dermatologist for serious, worsening, or persistent symptoms.';

// ─── Static treatment mapping (fallback) ─────────────────────
const getStaticTreatment = (disease) => {
  const d = (disease || '').toLowerCase();

  if (d.includes('acne') || d.includes('rosacea') || d.includes('pimple')) {
    return [
      'Use a gentle cleanser twice daily.',
      'Avoid picking or squeezing pimples.',
      'Use dermatologist-approved acne products.',
      'Use non-comedogenic skincare and makeup products.',
      'Consult a dermatologist if symptoms worsen.',
    ];
  }
  if (d.includes('eczema') || d.includes('atopic') || d.includes('dermatitis')) {
    return [
      'Keep the skin moisturized regularly.',
      'Avoid harsh soaps, fragrances, and known triggers.',
      'Use gentle, fragrance-free skincare products.',
      'Do not scratch the affected area.',
      'Consult a dermatologist if irritation persists.',
    ];
  }
  if (d.includes('psoriasis')) {
    return [
      'Keep skin moisturized.',
      'Avoid scratching affected areas.',
      'Use dermatologist-recommended treatments.',
      'Avoid harsh products on affected skin.',
      'Consult a dermatologist for proper diagnosis and care.',
    ];
  }
  if (d.includes('ringworm') || d.includes('tinea') || d.includes('fungal')) {
    return [
      'Keep the affected area clean and dry.',
      'Avoid sharing towels or clothes.',
      'Use antifungal treatment as advised by a doctor.',
      'Wash hands after touching the affected area.',
      'Consult a dermatologist if it spreads.',
    ];
  }
  if (
    d.includes('melanoma') || d.includes('cancer') ||
    d.includes('carcinoma') || d.includes('lesion') ||
    d.includes('basal') || d.includes('squamous')
  ) {
    return [
      'Do not self-diagnose.',
      'Avoid delaying medical care.',
      'Book an appointment with a certified dermatologist immediately.',
      'Monitor changes in size, color, shape, or bleeding.',
      'Seek urgent medical advice if the lesion changes rapidly.',
    ];
  }
  if (d.includes('vitiligo')) {
    return [
      'Protect depigmented skin from sun exposure using sunscreen.',
      'Consult a dermatologist for treatment options.',
      'Avoid skin trauma to affected areas.',
      'Consider light therapy under medical supervision.',
      'Monitor for spread and consult regularly.',
    ];
  }
  if (d.includes('wart') || d.includes('molluscum')) {
    return [
      'Avoid touching or picking at the affected area.',
      'Keep the area clean and dry.',
      'Do not share personal items.',
      'Consult a dermatologist for proper removal treatment.',
      'Monitor for spread to other areas.',
    ];
  }
  // Default / No clear detection
  return [
    'Avoid self-medication.',
    'Keep the affected area clean.',
    'Avoid applying harsh products.',
    'Monitor symptoms closely.',
    'Consult a certified dermatologist.',
  ];
};

// ─── OpenAI cure generation ───────────────────────────────────
const getCureSuggestionFromOpenAI = async (detectedDisease, confidence) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  const prompt = `A skin analysis AI detected "${detectedDisease}" with ${confidence}% confidence.

Provide safe, general, educational care suggestions for this condition.
- Do NOT claim this is a medical diagnosis.
- Keep suggestions practical and general.
- Always recommend consulting a certified dermatologist.
- Return ONLY valid JSON. No markdown. No extra text.

Return this exact JSON:
{
  "treatment": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3",
    "suggestion 4",
    "suggestion 5"
  ],
  "disclaimer": "This result is AI-assisted and for educational purposes only. It is not a medical diagnosis. Please consult a certified dermatologist for serious, worsening, or persistent symptoms."
}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a general health education assistant. You provide educational information only, never medical diagnosis.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens:  512,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const raw = response.data.choices[0]?.message?.content || '';

  // Clean and parse
  const cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  return JSON.parse(cleaned);
};

// ─── Main exported function ───────────────────────────────────
/**
 * Get cure suggestions for a detected skin disease.
 * Tries OpenAI first, falls back to static mapping.
 * Always returns: { treatment: string[], disclaimer: string }
 */
const getCureSuggestion = async (detectedDisease, confidence) => {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log(`💊 Generating cure via OpenAI for: ${detectedDisease}`);
      const result = await getCureSuggestionFromOpenAI(detectedDisease, confidence);

      if (Array.isArray(result.treatment) && result.treatment.length > 0) {
        console.log('✅ OpenAI cure suggestion generated');
        return {
          treatment:  result.treatment,
          disclaimer: result.disclaimer || DISCLAIMER,
        };
      }
    } catch (err) {
      console.warn(`⚠️  OpenAI cure failed, using static fallback: ${err.message}`);
    }
  }

  // Static fallback
  console.log(`📋 Using static treatment mapping for: ${detectedDisease}`);
  return {
    treatment:  getStaticTreatment(detectedDisease),
    disclaimer: DISCLAIMER,
  };
};

module.exports = { getCureSuggestion, getStaticTreatment, DISCLAIMER };
