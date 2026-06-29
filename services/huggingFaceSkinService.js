const axios = require('axios');
const fs = require('fs');

/**
 * Hugging Face Skin Disease Detection Service
 * Model: abdlh/ResNet34_finetuned_for_skin_diseases_by-abdlh
 */

const getConfig = () => {
  const apiKey =
    process.env.HF_API_KEY ||
    process.env.SKIN_MODEL_API_KEY ||
    null;

  const modelUrl =
    process.env.HF_MODEL_URL ||
    process.env.SKIN_MODEL_API_URL ||
    'https://api-inference.huggingface.co/models/abdlh/ResNet34_finetuned_for_skin_diseases_by-abdlh';

  return { apiKey, modelUrl };
};

const normalizeLabel = (label) => {
  return label
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const analyzeSkinImage = async (imagePath) => {
  const { apiKey, modelUrl } = getConfig();

  if (!apiKey) {
    throw new Error(
      'Skin model API is not configured. Please add HF_API_KEY to your .env file.'
    );
  }

  // Read image as binary buffer
  let imageBuffer;
  try {
    imageBuffer = fs.readFileSync(imagePath);
    console.log(`📦 Image buffer size: ${imageBuffer.length} bytes`);
  } catch (err) {
    console.error('❌ Failed to read image file:', err.message);
    throw new Error('Could not read the uploaded image file.');
  }

  console.log(`🚀 Calling Hugging Face API: ${modelUrl}`);

  let responseData;
  try {
    const response = await axios.post(modelUrl, imageBuffer, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    responseData = response.data;
    console.log('✅ HF raw response:', JSON.stringify(responseData).substring(0, 200));
  } catch (err) {
    // Log full error for debugging
    if (err.response) {
      console.error('❌ HF API error status:', err.response.status);
      console.error('❌ HF API error body:', JSON.stringify(err.response.data));

      const body = err.response.data;

      // Model loading
      if (
        body &&
        typeof body.error === 'string' &&
        (body.error.includes('loading') || body.error.includes('Loading'))
      ) {
        const waitTime = body.estimated_time
          ? `Please try again in about ${Math.ceil(body.estimated_time)} seconds.`
          : 'Please try again in about 30 seconds.';
        throw new Error(`The skin disease model is currently loading. ${waitTime}`);
      }

      // Auth error with HF
      if (err.response.status === 401) {
        throw new Error(
          'Hugging Face API key is invalid or expired. Please check HF_API_KEY in your .env file.'
        );
      }

      // Model not found
      if (err.response.status === 404) {
        throw new Error(
          'Skin disease model not found on Hugging Face. Please check HF_MODEL_URL.'
        );
      }

      throw new Error(
        `Skin disease analysis failed: ${body?.error || err.response.status}`
      );
    }

    // Timeout
    if (err.code === 'ECONNABORTED') {
      throw new Error(
        'The skin disease model took too long to respond. It may be loading — please try again in 30 seconds.'
      );
    }

    // Network error
    console.error('❌ HF network error:', err.message);
    throw new Error(
      'Skin disease analysis service is temporarily unavailable. Please check your connection and try again.'
    );
  }

  // Parse response
  if (!Array.isArray(responseData) || responseData.length === 0) {
    console.error('❌ Unexpected HF response format:', responseData);
    throw new Error('Unexpected response from skin analysis model. Please try again.');
  }

  const sorted = [...responseData].sort((a, b) => b.score - a.score);
  const top = sorted[0];

  console.log(`🎯 Top result: ${top.label} (${Math.round(top.score * 100)}%)`);

  return {
    detectedDisease: normalizeLabel(top.label),
    confidence: Math.round(top.score * 100),
    rawModelResponse: responseData,
  };
};

module.exports = { analyzeSkinImage };
