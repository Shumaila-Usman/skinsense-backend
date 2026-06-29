# SkinSense AI — Skin Disease Detection Setup

## Architecture

```
Mobile App (Expo Go)
  → User picks skin image
  → POST /api/scans/analyze (multipart/form-data)
  → Backend: Roboflow detects disease
  → Backend: OpenAI generates cure suggestions
  → Scan saved to MongoDB
  → Response to frontend
```

---

## Skin Disease Detection — Roboflow

**Model:** `deep-derma-lmpy4` (Version 1)  
**Provider:** Roboflow Classify API  
**Endpoint:** `https://classify.roboflow.com/deep-derma-lmpy4/1`

### Required .env variables

```env
SKIN_MODEL_PROVIDER=roboflow
ROBOFLOW_API_KEY=your_roboflow_key_here
ROBOFLOW_PROJECT_ID=deep-derma-lmpy4
ROBOFLOW_VERSION=1
USE_DUMMY_SCAN=false
```

### Get your Roboflow API key

1. Go to https://roboflow.com and sign in
2. Go to Settings → API Keys
3. Copy your API key
4. Paste as `ROBOFLOW_API_KEY=` in `.env`

---

## Cure Suggestion — OpenAI

After Roboflow detects the disease, OpenAI generates educational care suggestions.

```env
OPENAI_API_KEY=sk_your_key_here
OPENAI_CHAT_MODEL=gpt-4o-mini
```

If OpenAI is not configured or fails, the system falls back to static treatment mapping.

---

## Dummy Mode (for testing without APIs)

```env
USE_DUMMY_SCAN=true
```

Returns random disease results (Acne/Eczema/Psoriasis/Ringworm) with static treatment.

---

## Postman Test

### Step 1 — Get JWT token
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json
{ "email": "user@example.com", "password": "password123" }
```

### Step 2 — Test scan
```
POST http://localhost:5000/api/scans/analyze
Authorization: Bearer <token>
Body: form-data
  image: <select image file>
```

### Expected response
```json
{
  "success": true,
  "scan": {
    "detectedDisease": "Acne",
    "confidence": "87%",
    "treatment": ["Use gentle cleanser...", "Avoid picking..."],
    "disclaimer": "This result is AI-assisted...",
    "image": "/uploads/scans/scan_xxx.jpg"
  }
}
```

---

## Important Notes

- Roboflow and OpenAI API keys are used ONLY in the backend
- Never commit `.env` to GitHub
- This is for educational purposes only — not medical diagnosis
