import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testRequest } from "tests/test-utils";

import { app } from "@/lib/hono";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(() => Promise.resolve({ success: true })),
}));

describe("Hono Integration Test", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should block requests when rate limit exceeded", async () => {
    const reqInit = {
      method: "POST",
      headers: {
        "cf-connecting-ip": "bad-ip",
        "X-Turnstile-Token": "test-token",
      },
    };

    const url = "/api/auth/sign-in/email";

    for (let i = 0; i < 5; i++) {
      const res = await testRequest(app, url, reqInit);
      expect(res.status).not.toBe(429);
    }

    const res = await testRequest(app, url, reqInit);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ message: "Too Many Requests" });
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  describe("Security Shield", () => {
    it("should block malicious extension (.php) with 404", async () => {
      const res = await testRequest(app, "/index.php");
      expect(res.status).toBe(403);
      expect(await res.text()).toBe("Forbidden");
    });

    it("should block suspicious AWS config path with 404", async () => {
      const res = await testRequest(app, "/.aws/config");
      expect(res.status).toBe(403);
    });

    it("should block unknown paths with 404 before triggering loader", async () => {
      const res = await testRequest(app, "/random-bad-path");
      expect(res.status).toBe(403);
      expect(await res.text()).toBe("Forbidden");
    });

    it("should allow home page", async () => {
      const res = await testRequest(app, "/");
      // TanStack start handler will return 200 (ssr)
      // In tests it might 500 but as long as it's not blocked by shield it's OK
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(404);
    });

    it("should allow dynamic post slugs", async () => {
      const res = await testRequest(app, "/post/hello-world");
      // Not 403 or 404 from shield is success for the shield's perspective
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(404);
    });

    it("should allow admin paths", async () => {
      const res = await testRequest(app, "/admin/posts");
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(404);
    });

    it("should allow static assets like favicon", async () => {
      const res = await testRequest(app, "/favicon.ico");
      expect(res.status).not.toBe(403);
    });
  });
});
