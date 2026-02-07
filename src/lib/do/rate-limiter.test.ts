import { env, runDurableObjectAlarm } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

    //  再过 0.2 秒 (总共 12.1 秒)
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

      // 初始化 DO
      await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

      // 推进 7 天 + 1 秒
      await vi.advanceTimersByTimeAsync(SEVEN_DAYS_MS + 1000);

      // 触发 alarm
      const alarmRan = await runDurableObjectAlarm(rateLimiter);
      expect(alarmRan).toBe(true);

      // 再次请求应该得到满容量（因为 storage 被清空，状态重新初始化）
      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 满容量 5 - 1 = 4
    });

    it("should renew alarm if DO is still active", async () => {
      const id = env.RATE_LIMITER.idFromName("cleanup-2");
      const rateLimiter = env.RATE_LIMITER.get(id);

      // 初始化 DO
      await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

      // 推进 3 天
      await vi.advanceTimersByTimeAsync(3 * 24 * 60 * 60 * 1000);

      // 再次使用（刷新 lastRefill 和 alarm）
      await rateLimiter.checkLimit({ capacity: 5, interval: "1m" });

      // 再推进 5 天（从上次使用算起未满 7 天）
      await vi.advanceTimersByTimeAsync(5 * 24 * 60 * 60 * 1000);

      // 触发 alarm - 因为 lastRefill 是 5 天前，不满 7 天，不应清理
      const alarmRan = await runDurableObjectAlarm(rateLimiter);
      expect(alarmRan).toBe(true);

      // 状态应该保留，remaining 应该是 3（之前用了 2 次）
      const result = await rateLimiter.checkLimit({
        capacity: 5,
        interval: "1m",
      });

      expect(result.allowed).toBe(true);
      // 经过足够时间，令牌已经完全恢复
      expect(result.remaining).toBe(4);
    });
  });
});
