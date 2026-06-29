/**
 * Roboflow Skin Disease Detection Service
 * Model: deep-derma-lmpy4 (version 1)
 * Endpoint: https://classify.roboflow.com/{PROJECT}/{VERSION}
 */

const axios = require('axios');
const fs    = require('fs');

// ─── Normalize label ─────────────────────────────────────────
const normalizeLabel = (label) =>
  label
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

// ─── Get confidence threshold from .env ──────────────────────
// Default: 0.70 (70%)
const getConfidenceThreshold = () => {
  const val = parseFloat(process.env.ROBOFLOW_CONFIDENCE_THRESHOLD);
  return isNaN(val) ? 0.70 : Math.min(Math.max(val, 0), 1);
};

// ─── Find highest-confidence prediction from any response format
const extractTopPrediction = (responseData) => {
  // Format 1: { top: "Acne", confidence: 0.87, predictions: {...} }
  if (responseData.top && responseData.confidence !== undefined) {
    return {
      label:      normalizeLabel(responseData.top),
      confidence: responseData.confidence, // raw 0-1 float
    };
  }

  // Format 2: { predictions: { "Acne": { confidence: 0.87 }, ... } }
  if (responseData.predictions && typeof responseData.predictions === 'object') {
    const entries = Object.entries(responseData.predictions);
    if (entries.length === 0) return null;

    // Sort all predictions by confidence descending — pick the highest
    entries.sort((a, b) => (b[1].confidence || 0) - (a[1].confidence || 0));
    const [label, data] = entries[0];
    return {
      label:      normalizeLabel(label),
      confidence: data.confidence || 0,
    };
  }

  // Format 3: array [ { class: "Acne", confidence: 0.87 }, ... ]
  if (Array.isArray(responseData.predictions)) {
    if (responseData.predictions.length === 0) return null;
    const sorted = [...responseData.predictions].sort(
      (a, b) => (b.confidence || 0) - (a.confidence || 0)
    );
    const top = sorted[0];
    return {
      label:      normalizeLabel(top.class || top.label || 'Unknown'),
      confidence: top.confidence || 0,
    };
  }

  return null;
};

// ─── Main: analyze image via Roboflow ────────────────────────
const analyzeSkinImage = async (imagePath, imageBuffer) => {
  const apiKey    = process.env.ROBOFLOW_API_KEY;
  const projectId = process.env.ROBOFLOW_PROJECT_ID || 'deep-derma-lmpy4';
  const version   = process.env.ROBOFLOW_VERSION    || '1';
  const threshold = getConfidenceThreshold();

  if (!apiKey) {
    throw new Error(
      'Roboflow API key is missing. Please add ROBOFLOW_API_KEY to your .env file.'
    );
  }

  // Read image as base64 — from buffer (memory storage) or file path (disk storage)
  let imageBase64;
  try {
    if (imageBuffer) {
      // Memory storage: use buffer directly
      imageBase64 = imageBuffer.toString('base64');
      console.log(`📦 Image size (buffer): ${imageBuffer.length} bytes`);
    } else {
      // Disk storage: read from file path
      const buffer = fs.readFileSync(imagePath);
      imageBase64  = buffer.toString('base64');
      console.log(`📦 Image size (disk): ${buffer.length} bytes`);
    }
  } catch (err) {
    throw new Error('Could not read the uploaded image file.');
  }

  const url = `https://classify.roboflow.com/${projectId}/${version}?api_key=${apiKey}`;
  console.log(`🚀 Calling Roboflow: ${projectId} v${version} (threshold: ${threshold})`);

  let responseData;
  try {
    const response = await axios.post(url, imageBase64, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });
    responseData = response.data;
    console.log('✅ Roboflow raw:', JSON.stringify(responseData).substring(0, 300));
  } catch (err) {
    if (err.response) {
      console.error('❌ Roboflow error:', err.response.status, JSON.stringify(err.response.data));
      if (err.response.status === 401 || err.response.status === 403) {
        throw new Error('Roboflow API key is invalid. Please check ROBOFLOW_API_KEY.');
      }
      if (err.response.status === 404) {
        throw new Error(
          'Roboflow project not found. Check ROBOFLOW_PROJECT_ID and ROBOFLOW_VERSION.'
        );
      }
      throw new Error(
        `Roboflow API error ${err.response.status}: ${err.response.data?.message || 'Unknown error'}`
      );
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('Roboflow request timed out. Please try again.');
    }
    throw new Error('Skin disease detection service is temporarily unavailable. Please try again.');
  }

  // ─── Extract top prediction ───────────────────────────────
  const top = extractTopPrediction(responseData);

  if (!top) {
    console.error('❌ Unexpected Roboflow response format:', responseData);
    throw new Error('Unexpected response from Roboflow. Please try a clearer image.');
  }

  const confidencePct = Math.round(top.confidence * 100);
  console.log(`🎯 Top prediction: ${top.label} (${confidencePct}%) — threshold: ${Math.round(threshold * 100)}%`);

  // ─── Confidence threshold check ──────────────────────────
  if (top.confidence < threshold) {
    console.log(
      `⚠️  Confidence ${confidencePct}% is below threshold ${Math.round(threshold * 100)}% — flagging as unclear`
    );
    return {
      detectedDisease: 'No clear disease detected',
      confidence:      confidencePct,
      belowThreshold:  true,
      originalLabel:   top.label,  // kept for logging/debugging
    };
  }

  return {
    detectedDisease: top.label,
    confidence:      confidencePct,
    belowThreshold:  false,
  };
};

module.exports = { analyzeSkinImage };
