import { env, runDurableObjectAlarm } from "cloudflare:test";
import { testRequest } from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "@/lib/hono";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(() => Promise.resolve({ success: true })),
}));

describe("Durable Objects Integration", () => {
  describe("PasswordHasher", () => {
    function getHasher() {
      const id = env.PASSWORD_HASHER.idFromName("hasher-0");
      return env.PASSWORD_HASHER.get(id);
    }

    it("should hash a password and return salt:key format", async () => {
      const hasher = getHasher();
      const hash = await hasher.hash("test-password-123");

      expect(hash).toContain(":");
      const [salt, key] = hash.split(":");
      expect(salt).toHaveLength(32);
      expect(key).toHaveLength(128);
    });

    it("should verify a correct password", async () => {
      const hasher = getHasher();
      const hash = await hasher.hash("my-secure-password");

      const result = await hasher.verify({
        hash,
        password: "my-secure-password",
      });
      expect(result).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const hasher = getHasher();
      const hash = await hasher.hash("correct-password");

      const result = await hasher.verify({
        hash,
        password: "wrong-password",
      });
      expect(result).toBe(false);
    });

    it("should produce different hashes for the same password (random salt)", async () => {
      const hasher = getHasher();
      const hash1 = await hasher.hash("same-password");
      const hash2 = await hasher.hash("same-password");

      expect(hash1).not.toBe(hash2);

      expect(
        await hasher.verify({ hash: hash1, password: "same-password" }),
      ).toBe(true);
      expect(
        await hasher.verify({ hash: hash2, password: "same-password" }),
      ).toBe(true);
    });
  });

  describe("RateLimiter", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should allow request if there are enough tokens", async () => {
      const id = env.RATE_LIMITER.idFromName("user-1");
      const rateLimiter = env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfterMs).toBe(0);
    });

    it("should reject request if there are not enough tokens", async () => {
      const id = env.RATE_LIMITER.idFromName("user-2");
      const rateLimiter = env.RATE_LIMITER.get(id);

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });
      }

      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reject request if cost is greater than capacity", async () => {
      const id = env.RATE_LIMITER.idFromName("user-3");
      const rateLimiter = env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
        cost: 6,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(-1);
    });

    it("should refill tokens after time passes", async () => {
      const id = env.RATE_LIMITER.idFromName("user-4");
      const rateLimiter = env.RATE_LIMITER.get(id);

      const config = { capacity: 5, interval: "1m" as const };

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(config);
      }

      await vi.advanceTimersByTimeAsync(11900);

      const result = await rateLimiter.checkLimit(config);
      expect(result.allowed).toBe(false);

      await vi.advanceTimersByTimeAsync(200);

      const resultSuccess = await rateLimiter.checkLimit(config);
      expect(resultSuccess.allowed).toBe(true);
    });

    it("should correctly calculate retry after time", async () => {
      const id = env.RATE_LIMITER.idFromName("user-5");
      const rateLimiter = env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfterMs).toBe(0);

      for (let i = 0; i < 4; i++) {
        await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });
      }

      const rejected = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(rejected.allowed).toBe(false);
      expect(rejected.remaining).toBe(0);
      expect(rejected.retryAfterMs).toBe(12 * 1000);
    });

    it("should handle custom cost", async () => {
      const id = env.RATE_LIMITER.idFromName("user-6");
      const rateLimiter = env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
        cost: 2,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
      expect(result.retryAfterMs).toBe(0);
    });

    describe("alarm cleanup", () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      it("should clean up inactive DO after 7 days", async () => {
        const id = env.RATE_LIMITER.idFromName("cleanup-1");
        const rateLimiter = env.RATE_LIMITER.get(id);

        await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

        await vi.advanceTimersByTimeAsync(SEVEN_DAYS_MS + 1000);

        const alarmRan = await runDurableObjectAlarm(rateLimiter);
        expect(alarmRan).toBe(true);

        const result = await rateLimiter.checkLimit({
          capacity: 5,
          interval: "1m",
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });

      it("should renew alarm if DO is still active", async () => {
        const id = env.RATE_LIMITER.idFromName("cleanup-2");
        const rateLimiter = env.RATE_LIMITER.get(id);

        await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

        await vi.advanceTimersByTimeAsync(3 * 24 * 60 * 60 * 1000);

        await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

        await vi.advanceTimersByTimeAsync(5 * 24 * 60 * 60 * 1000);

        const alarmRan = await runDurableObjectAlarm(rateLimiter);
        expect(alarmRan).toBe(true);

        const result = await rateLimiter.checkLimit({
          capacity: 5,
          interval: "1m",
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });
    });
  });

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
      expect(await res.json()).toEqual({
        code: "RATE_LIMITED",
        message: "Too Many Requests",
        retryAfterMs: expect.any(Number),
      });
      expect(res.headers.get("Retry-After")).toBeDefined();
    });

    describe("Security Shield", () => {
      it("should block malicious extension (.php) with 404", async () => {
        const res = await testRequest(app, "/index.php");
        expect(res.status).toBe(404);
        expect(await res.text()).toBe("Not Found");
      });

      it("should block suspicious AWS config path with 404", async () => {
        const res = await testRequest(app, "/.aws/config");
        expect(res.status).toBe(404);
      });

      it("should block unknown paths with 404 before triggering loader", async () => {
        const res = await testRequest(app, "/random-bad-path");
        expect(res.status).toBe(404);
        expect(await res.text()).toBe("Not Found");
      });

      it("should allow home page", async () => {
        const res = await testRequest(app, "/");
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(404);
      });

      it("should allow dynamic post slugs", async () => {
        const res = await testRequest(app, "/post/hello-world");
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
});
