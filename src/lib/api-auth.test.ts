/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { authenticateApiRequest, requireAuthOrDemo, isDemoModeAllowed } from "./api-auth";
import { JWT_SECRET } from "@/app/config/auth";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";

describe("api-auth security guard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("authenticates valid JWT cookie and extracts user", async () => {
    const validToken = jwt.sign(
      { id: "507f1f77bcf86cd799439011", email: "alice@example.com", name: "Alice", plan: "free" },
      JWT_SECRET
    );

    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (name === "token" ? { value: validToken } : undefined),
    });

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    const result = await authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.user.id).toBe("507f1f77bcf86cd799439011");
      expect(result.user.email).toBe("alice@example.com");
    }
  });

  test("blocks IDOR attempt: rejects unauthenticated request supplying real ObjectId", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    // An attacker attempts to specify victim's ObjectId
    const victimId = "507f191e810c19729de860ea";
    const result = await authenticateApiRequest(req, victimId);

    expect(result.authenticated).toBe(false);
    expect(result.isDemo).toBe(false);
    if (!result.authenticated && !result.isDemo) {
      expect(result.error).toMatch(/Authentication required/i);
    }
  });

  test("allows demo session in non-production for demo123", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });
    (process.env as any).NODE_ENV = "development";

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    const result = await authenticateApiRequest(req, "demo123");
    expect(result.authenticated).toBe(false);
    expect(result.isDemo).toBe(true);
    if (result.isDemo) {
      expect(result.user.id).toBe("demo123");
    }
  });

  test("blocks demo session in production unless ALLOW_DEMO_MODE=true", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });
    (process.env as any).NODE_ENV = "production";
    delete process.env.ALLOW_DEMO_MODE;

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    const result = await authenticateApiRequest(req, "demo123");
    expect(result.authenticated).toBe(false);
    expect(result.isDemo).toBe(false);
  });

  test("requireAuthOrDemo returns HTTP 401 in production when demo123 is passed without token", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });
    (process.env as any).NODE_ENV = "production";
    delete process.env.ALLOW_DEMO_MODE;

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    const guardResult = await requireAuthOrDemo(req, "demo123");
    expect("response" in guardResult).toBe(true);
    if ("response" in guardResult) {
      expect(guardResult.response.status).toBe(401);
      const json = await guardResult.response.json();
      expect(json.error).toBe("Authentication required.");
    }
  });

  test("requireAuthOrDemo allows demo session in production only when ALLOW_DEMO_MODE=true", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: () => undefined,
    });
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_MODE = "true";

    const req = new Request("http://localhost/api/analyze-document", {
      method: "POST",
    });

    const guardResult = await requireAuthOrDemo(req, "demo123");
    expect("auth" in guardResult).toBe(true);
    if ("auth" in guardResult) {
      expect(guardResult.auth.isDemo).toBe(true);
      expect(guardResult.auth.user.id).toBe("demo123");
    }
  });
});
