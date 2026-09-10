/**
 * @jest-environment node
 */
import { POST as uploadPOST } from "./upload/route";
import { GET as styleGuideGET, DELETE as styleGuideDELETE } from "./route";
import { resetInMemoryVectorStore, queryVectors } from "@/lib/vector-store";
import { generateEmbedding } from "@/lib/embeddings";

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: () => undefined,
  }),
}));

// Allow demo mode for node testing
process.env.ALLOW_DEMO_MODE = "true";

describe("Style Guide API Endpoints", () => {
  beforeEach(() => {
    resetInMemoryVectorStore();
  });

  test("POST /api/style-guide/upload parses rules, embeds them and stores in vector store", async () => {
    const rawGuide = `
# Engineering Writing Guidelines
- Use 'eBPF', never 'Ebpf' or 'ebpf'.
- Always use 'PostgreSQL' instead of 'Postgres'.
- Refer to client as 'Grammar Master'.
    `;

    const req = new Request("http://localhost/api/style-guide/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Tech Docs Guide",
        content: rawGuide,
        _id: "demo123",
      }),
    });

    const res = await uploadPOST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.styleGuide.rulesCount).toBe(3);
    expect(data.styleGuide.name).toBe("Tech Docs Guide");

    // Verify vectors were indexed in vector store
    const queryEmb = await generateEmbedding("Ebpf kernel tracing");
    const matches = await queryVectors(queryEmb, "demo123", 3);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].metadata?.text).toBe("Use 'eBPF', never 'Ebpf' or 'ebpf'.");
  });

  test("POST /api/style-guide/upload returns 400 on empty content", async () => {
    const req = new Request("http://localhost/api/style-guide/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Empty Guide",
        content: "   ",
        _id: "demo123",
      }),
    });

    const res = await uploadPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("GET /api/style-guide returns user style guides in demo mode", async () => {
    const req = new Request("http://localhost/api/style-guide?_id=demo123", {
      method: "GET",
    });

    const res = await styleGuideGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.styleGuides)).toBe(true);
  });
});
