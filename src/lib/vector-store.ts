import { cosineSimilarity } from "./embeddings";

export interface VectorMetadata {
  userId: string;
  styleGuideId: string;
  text: string;
  [key: string]: any;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
}

export interface VectorQueryResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

class InMemoryVectorStore {
  private records: Map<string, VectorRecord> = new Map();

  upsert(records: VectorRecord[]) {
    for (const rec of records) {
      this.records.set(rec.id, rec);
    }
  }

  query(vector: number[], userId: string, topK = 3): VectorQueryResult[] {
    const matches: VectorQueryResult[] = [];

    for (const [id, record] of this.records.entries()) {
      if (record.metadata && String(record.metadata.userId) === String(userId)) {
        const score = cosineSimilarity(vector, record.vector);
        matches.push({
          id,
          score,
          metadata: record.metadata,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, topK);
  }

  delete(ids: string[]) {
    for (const id of ids) {
      this.records.delete(id);
    }
  }

  clear() {
    this.records.clear();
  }
}

const globalWithVector = globalThis as typeof globalThis & {
  __inMemoryVectorStore?: InMemoryVectorStore;
};

if (!globalWithVector.__inMemoryVectorStore) {
  globalWithVector.__inMemoryVectorStore = new InMemoryVectorStore();
}

const memoryStore = globalWithVector.__inMemoryVectorStore;

let upstashIndexInstance: any = null;

function getUpstashIndex() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!upstashIndexInstance) {
    try {
      const { Index } = require("@upstash/vector");
      upstashIndexInstance = new Index({ url, token });
    } catch (e) {
      console.warn("Failed to initialize Upstash Vector client:", e);
      return null;
    }
  }

  return upstashIndexInstance;
}

export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  if (records.length === 0) return;

  const upstash = getUpstashIndex();
  if (upstash) {
    try {
      await upstash.upsert(records);
      return;
    } catch (err) {
      console.error("Upstash Vector upsert failed, falling back to memory store:", err);
    }
  }

  memoryStore.upsert(records);
}

export async function queryVectors(
  vector: number[],
  userId: string,
  topK = 3
): Promise<VectorQueryResult[]> {
  const upstash = getUpstashIndex();
  if (upstash) {
    try {
      // Query with metadata filter for user isolation
      const results = await upstash.query({
        vector,
        topK,
        filter: `userId = '${userId}'`,
        includeMetadata: true,
      });

      return results.map((r: any) => ({
        id: String(r.id),
        score: Number(r.score || 0),
        metadata: r.metadata as VectorMetadata,
      }));
    } catch (err) {
      console.error("Upstash Vector query failed, falling back to memory store:", err);
    }
  }

  return memoryStore.query(vector, userId, topK);
}

export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const upstash = getUpstashIndex();
  if (upstash) {
    try {
      await upstash.delete(ids);
    } catch (err) {
      console.error("Upstash Vector delete failed:", err);
    }
  }

  memoryStore.delete(ids);
}

export function resetInMemoryVectorStore(): void {
  memoryStore.clear();
}
