# SkinSense AI — RAG Product Recommendation Setup

## Architecture

```
User fills skin profile (ProductPromptScreen)
  → POST /api/recommendations/generate-rag
  → Backend: build vector query from user profile
  → Qdrant: semantic search → top 12 Sephora products
  → OpenAI gpt-4o-mini: generate structured recommendation JSON
  → Save to MongoDB
  → Return to RecommendationResultScreen
```

**Embeddings:** OpenAI `text-embedding-3-small` (1536 dims)  
**LLM:** OpenAI `gpt-4o-mini`  
**Vector DB:** Qdrant (local)  
**HuggingFace:** NOT used in RAG pipeline  
**Groq:** Optional fallback only (if GROQ_API_KEY is set and OpenAI fails)

---

## Required .env variables

```env
OPENAI_API_KEY=sk_your_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=skinsense_products
EMBEDDING_PROVIDER=openai
LLM_PROVIDER=openai
```

---

## Step 1 — Place the CSV

```
backend/data/product_info.csv
```

---

## Step 2 — Import products to MongoDB (run once)

```bash
cd e:\fyp\FYP\backend
node scripts/importProductsFromCSV.js
```

---

## Step 3 — Start Qdrant

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Verify: http://localhost:6333/dashboard

---

## Step 4 — Index products to Qdrant

First time (or if switching from HuggingFace to OpenAI embeddings):
```bash
node scripts/indexProductsToQdrant.js --recreate
```

Subsequent runs (adds/updates only):
```bash
node scripts/indexProductsToQdrant.js
```

**Note:** `--recreate` deletes the old collection and rebuilds it with 1536-dim OpenAI vectors.  
Use this if you see a "dimension mismatch" error.

---

## Step 5 — Start backend

```bash
npm run dev
```

---

## Postman Test

### Get JWT token
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json
{ "email": "user@example.com", "password": "password123" }
```

### Test RAG recommendation
```
POST http://localhost:5000/api/recommendations/generate-rag
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "your_user_id",
  "skinType": "Oily",
  "skinConcern": "acne and large pores",
  "ageRange": "18-25",
  "routine": "basic cleanser only",
  "allergies": "fragrance",
  "productType": "skincare and makeup"
}
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `OpenAI API key is missing` | Add `OPENAI_API_KEY` to `.env` and restart |
| `Product search service unavailable` | Start Qdrant: `docker run -p 6333:6333 qdrant/qdrant` |
| `dimension mismatch` | Run `node scripts/indexProductsToQdrant.js --recreate` |
| `No products found` | Run `importProductsFromCSV.js` then `indexProductsToQdrant.js` |
| `AI returned invalid format` | Retry — rare JSON formatting issue |

---

## Notes

- OpenAI API key is used ONLY in the backend — never sent to frontend
- Never commit `.env` to GitHub
- For educational purposes only — not medical or professional advice
