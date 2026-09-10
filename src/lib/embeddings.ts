let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        if (env) {
          env.allowLocalModels = false;
        }
        return await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      } catch (err: any) {
        if (process.env.NODE_ENV === "test") {
          console.warn("[Embeddings] Test runner detected: using fallback test embedding generator.");
          return null;
        }
        console.error("❌ [Embeddings Critical] Failed to initialize @xenova/transformers:", err);
        throw new Error(`Failed to initialize transformer embedding model: ${err?.message || err}`);
      }
    })();
  }
  return extractorPromise;
}

/**
 * Generates a 384-dimensional normalized embedding vector for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const clean = text.trim();
  if (!clean) {
    return new Array(384).fill(0);
  }

  const extractor = await getExtractor();
  if (extractor) {
    try {
      const output = await extractor(clean, { pooling: "mean", normalize: true });
      if (output && output.data) {
        return Array.from(output.data);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV !== "test") {
        throw new Error(`Transformer feature extraction failed: ${e?.message || e}`);
      }
    }
  }

  // Deterministic 384-dim fallback embedding strictly for offline unit tests
  if (process.env.NODE_ENV === "test") {
    return generateDeterministicEmbedding(clean, 384);
  }

  throw new Error("[Embeddings] Transformer model unavailable in runtime.");
}

function hashToken(str: string, seed = 0): number {
  let h = seed ^ 0x12345678;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h ^ (h >>> 13)) >>> 0;
}

/**
 * Fallback deterministic subword + n-gram hash vector generator (normalized)
 */
export function generateDeterministicEmbedding(text: string, dimensions = 384): number[] {
  const vector = new Array(dimensions).fill(0);
  const clean = text.toLowerCase();
  const words = clean.match(/\b[a-z0-9_'-]+\b/g) || [clean];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // 1. Whole word feature
    const wIdx = hashToken(word, 1) % dimensions;
    vector[wIdx] += 3.0;

    // 2. Character 3-grams and 4-grams for subword / morph matching
    if (word.length >= 3) {
      for (let j = 0; j <= word.length - 3; j++) {
        const tri = word.slice(j, j + 3);
        const tIdx = hashToken(tri, 2) % dimensions;
        vector[tIdx] += 1.0;
      }
    }
    if (word.length >= 4) {
      for (let j = 0; j <= word.length - 4; j++) {
        const quad = word.slice(j, j + 4);
        const qIdx = hashToken(quad, 3) % dimensions;
        vector[qIdx] += 1.5;
      }
    }

    // 3. Word bigrams
    if (i > 0) {
      const bigram = `${words[i - 1]}_${word}`;
      const bIdx = hashToken(bigram, 4) % dimensions;
      vector[bIdx] += 2.0;
    }
  }

  // Normalize to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}
