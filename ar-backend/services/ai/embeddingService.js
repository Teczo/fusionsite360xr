/**
 * INFRASTRUCTURE REQUIREMENT:
 *
 * For vector search to work, create a Vector Search index in MongoDB Atlas:
 *   Atlas UI → Database → your cluster → Search Indexes → Create Index
 *
 * Index definition:
 * {
 *   "name": "document_vector_index",
 *   "type": "vectorSearch",
 *   "definition": {
 *     "fields": [
 *       {
 *         "type": "vector",
 *         "path": "embedding",
 *         "numDimensions": 1536,
 *         "similarity": "cosine"
 *       },
 *       {
 *         "type": "filter",
 *         "path": "projectId"
 *       }
 *     ]
 *   }
 * }
 *
 * NOTE: Vector Search requires Atlas M10+ tier (dedicated cluster).
 * On M0/M2/M5 shared clusters, vector search is not available.
 * The searchProjectDocuments function in queryService.js has a
 * triple fallback (vector → text → regex) so it works on any tier.
 */

import OpenAI from 'openai';

// Lazy initialization — client is created on first use so module loads cleanly
// even when OPENAI_API_KEY is not set (e.g. in non-AI environments).
let _openai = null;
function getClient() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate a 1536-dimension embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (cheapest, good quality).
 * Returns null on failure — callers must handle gracefully.
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  // text-embedding-3-small has 8191 token limit (~32k chars)
  // Truncate to be safe
  const truncated = text.substring(0, 30000);

  try {
    const response = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated
    });

    return response.data[0].embedding; // number[] with 1536 dimensions
  } catch (err) {
    console.error('Embedding generation failed:', err.message);
    return null;
  }
}
