import { createTestContext, waitForBackgroundTasks } from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import { serializeKey } from "@/features/cache/cache.utils";
import type { CacheNamespace } from "@/features/cache/types";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as ConfigService from "@/features/config/service/config.service";

describe("Infra Integration", () => {
  describe("CacheService", () => {
    describe("get", () => {
      it("should return cached data on cache hit", async () => {
        const context = createTestContext();
        const key = "test-cache-key";
        const cachedData = { name: "cached", value: 123 };
        const schema = z.object({ name: z.string(), value: z.number() });

        // Pre-populate cache
        await context.env.KV.put(key, JSON.stringify(cachedData));

        const fetcher = vi
          .fn()
          .mockResolvedValue({ name: "fresh", value: 999 });

        const result = await CacheService.get(context, key, schema, fetcher);

        expect(result).toEqual(cachedData);
        expect(fetcher).not.toHaveBeenCalled();
      });

      it("should fetch and cache data on cache miss", async () => {
        const context = createTestContext();
        const key = "test-miss-key";
        const freshData = { name: "fresh", value: 456 };
        const schema = z.object({ name: z.string(), value: z.number() });

        const fetcher = vi.fn().mockResolvedValue(freshData);

        const result = await CacheService.get(context, key, schema, fetcher);

        expect(result).toEqual(freshData);
        expect(fetcher).toHaveBeenCalledOnce();
        // Wait for fire-and-forget set() to complete
        await waitForBackgroundTasks(context.executionCtx);
      });

      it("should re-fetch when cached data fails schema validation", async () => {
        const context = createTestContext();
        const key = "test-invalid-schema-key";
        const invalidData = { invalid: "data" };
        const validData = { name: "valid", count: 10 };
        const schema = z.object({ name: z.string(), count: z.number() });

        // Pre-populate with invalid data
        await context.env.KV.put(key, JSON.stringify(invalidData));

        const fetcher = vi.fn().mockResolvedValue(validData);

        const result = await CacheService.get(context, key, schema, fetcher);

        expect(result).toEqual(validData);
        expect(fetcher).toHaveBeenCalledOnce();
        // Wait for fire-and-forget set() to complete
        await waitForBackgroundTasks(context.executionCtx);
      });

      it("should return null/undefined without caching when fetcher returns null", async () => {
        const context = createTestContext();
        const key = "test-null-key";
        const schema = z.object({ name: z.string() }).nullable();

        const fetcher = vi.fn().mockResolvedValue(null);

        const result = await CacheService.get(context, key, schema, fetcher);

        expect(result).toBeNull();
        expect(fetcher).toHaveBeenCalledOnce();

        // null fetcher result doesn't trigger set(), no need to wait
        // Verify null was NOT cached
        const cached = await context.env.KV.get(key);
        expect(cached).toBeNull();
      });

      it("should support array-based cache keys", async () => {
        const context = createTestContext();
        const key = ["v1", "posts", "my-slug"] as const;
        const data = { title: "Test Post" };
        const schema = z.object({ title: z.string() });

        const fetcher = vi.fn().mockResolvedValue(data);

        await CacheService.get(context, key, schema, fetcher);

        // Wait for fire-and-forget set() to complete
        await waitForBackgroundTasks(context.executionCtx);

        // Verify key was serialized correctly
        const serializedKey = serializeKey(key);
        expect(serializedKey).toBe("v1:posts:my-slug");

        const cached = await context.env.KV.get(serializedKey, "json");
        expect(cached).toEqual(data);
      });

      it("should correctly serialize and deserialize Date values", async () => {
        const context = createTestContext();
        const key = "test-date-key";
        const publishedAt = new Date("2024-06-15T10:30:00.000Z");
        const data = {
          title: "Post with Date",
          publishedAt,
          updatedAt: new Date("2024-06-16T12:00:00.000Z"),
        };
        // Use coerce.date() to properly deserialize ISO string back to Date
        const schema = z.object({
          title: z.string(),
          publishedAt: z.coerce.date(),
          updatedAt: z.coerce.date(),
        });

        const fetcher = vi.fn().mockResolvedValue(data);

        // First call - cache miss, fetcher called
        const result1 = await CacheService.get(context, key, schema, fetcher);
        expect(result1.title).toBe("Post with Date");
        expect(result1.publishedAt).toEqual(publishedAt);
        expect(result1.publishedAt).toBeInstanceOf(Date);

        await waitForBackgroundTasks(context.executionCtx);

        // Second call - cache hit, fetcher NOT called
        const result2 = await CacheService.get(context, key, schema, fetcher);
        expect(fetcher).toHaveBeenCalledOnce(); // Only first call
        expect(result2.title).toBe("Post with Date");
        expect(result2.publishedAt).toEqual(publishedAt);
        expect(result2.publishedAt).toBeInstanceOf(Date);
        expect(result2.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe("getRaw", () => {
      it("should return raw string value from cache", async () => {
        const context = createTestContext();
        const key = "raw-test-key";
        const value = "raw-string-value";

        await context.env.KV.put(key, value);

        const result = await CacheService.getRaw(context, key);

        expect(result).toBe(value);
      });

      it("should return null for non-existent key", async () => {
        const context = createTestContext();
        const key = "non-existent-key";

        const result = await CacheService.getRaw(context, key);

        expect(result).toBeNull();
      });

      it("should support array-based cache keys", async () => {
        const context = createTestContext();
        const key = ["hash", "post-123"] as const;
        const value = "abc123hash";

        await context.env.KV.put(serializeKey(key), value);

        const result = await CacheService.getRaw(context, key);

        expect(result).toBe(value);
      });
    });

    describe("set", () => {
      it("should store value in cache", async () => {
        const context = createTestContext();
        const key = "set-test-key";
        const value = JSON.stringify({ data: "test" });

        await CacheService.set(context, key, value);

        const stored = await context.env.KV.get(key);
        expect(stored).toBe(value);
      });

      it("should support array-based cache keys", async () => {
        const context = createTestContext();
        const key = ["v2", "posts", "slug"] as const;
        const value = "test-value";

        await CacheService.set(context, key, value);

        const stored = await context.env.KV.get(serializeKey(key));
        expect(stored).toBe(value);
      });

      it("should set TTL when provided", async () => {
        const context = createTestContext();
        const key = "ttl-test-key";
        const value = "ttl-value";

        // Note: In Miniflare test environment, we can't directly verify TTL
        // but we can ensure the call doesn't throw
        await expect(
          CacheService.set(context, key, value, { ttl: "1h" }),
        ).resolves.not.toThrow();

        const stored = await context.env.KV.get(key);
        expect(stored).toBe(value);
      });
    });

    describe("deleteKey", () => {
      it("should delete a single key", async () => {
        const context = createTestContext();
        const key = "delete-single-key";

        await context.env.KV.put(key, "value");

        await CacheService.deleteKey(context, key);

        const result = await context.env.KV.get(key);
        expect(result).toBeNull();
      });

      it("should delete multiple keys", async () => {
        const context = createTestContext();
        const keys = ["delete-key-1", "delete-key-2", "delete-key-3"];

        // Pre-populate all keys
        await Promise.all(keys.map((k) => context.env.KV.put(k, "value")));

        await CacheService.deleteKey(context, ...keys);

        // Verify all keys are deleted
        const results = await Promise.all(
          keys.map((k) => context.env.KV.get(k)),
        );
        expect(results).toEqual([null, null, null]);
      });

      it("should support array-based cache keys", async () => {
        const context = createTestContext();
        const key = ["v1", "post", "test-slug"] as const;
        const serialized = serializeKey(key);

        await context.env.KV.put(serialized, "value");

        await CacheService.deleteKey(context, key);

        const result = await context.env.KV.get(serialized);
        expect(result).toBeNull();
      });

      it("should not throw when deleting non-existent keys", async () => {
        const context = createTestContext();
        const key = "non-existent-delete-key";

        await expect(
          CacheService.deleteKey(context, key),
        ).resolves.not.toThrow();
      });
    });

    describe("getVersion", () => {
      it("should return bootstrap generation v0 when no generation exists", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("v0");
      });

      it("should preserve an existing numeric generation token", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";

        await context.env.KV.put(`ver:${namespace}`, "5");

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("v5");
      });

      it("should preserve an existing opaque generation token", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        await context.env.KV.put(`ver:${namespace}`, "opaque-generation");

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("vopaque-generation");
      });

      it("should reject an empty stored generation token", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";
        await context.env.KV.put(`ver:${namespace}`, "");

        await expect(
          CacheService.getVersion(context, namespace),
        ).rejects.toThrow("cache generation is empty");
      });

      it("should surface generation read failures", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";
        vi.spyOn(context.env.KV, "get").mockRejectedValueOnce(
          new Error("KV unavailable"),
        );

        await expect(
          CacheService.getVersion(context, namespace),
        ).rejects.toThrow("KV unavailable");
      });
    });

    describe("bumpVersion", () => {
      it("should rotate bootstrap v0 to a unique generation", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        await CacheService.bumpVersion(context, namespace);

        const stored = await context.env.KV.get(`ver:${namespace}`);
        expect(stored).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        expect(await CacheService.getVersion(context, namespace)).toBe(
          `v${stored}`,
        );
      });

      it("should rotate an existing numeric token without incrementing it", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";

        await context.env.KV.put(`ver:${namespace}`, "3");

        await CacheService.bumpVersion(context, namespace);

        const stored = await context.env.KV.get(`ver:${namespace}`);
        expect(stored).not.toBe("3");
        expect(stored).not.toBe("4");
      });

      it("should produce a different token on every rotation", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        await CacheService.bumpVersion(context, namespace);
        const first = await context.env.KV.get(`ver:${namespace}`);

        await CacheService.bumpVersion(context, namespace);
        const second = await context.env.KV.get(`ver:${namespace}`);

        expect(second).not.toBe(first);
      });

      it("should surface generation write failures", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";
        vi.spyOn(context.env.KV, "put").mockRejectedValueOnce(
          new Error("KV unavailable"),
        );

        await expect(
          CacheService.bumpVersion(context, namespace),
        ).rejects.toThrow("KV unavailable");
      });

      it("should make the bootstrap cache unreachable after one rotation", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";
        const slug = "test-post";

        const bootstrapKey = serializeKey(["v0", "post", slug]);
        await context.env.KV.put(
          bootstrapKey,
          JSON.stringify({ title: "Old Data" }),
        );

        await CacheService.bumpVersion(context, namespace);

        const newVersion = await CacheService.getVersion(context, namespace);
        expect(newVersion).not.toBe("v0");

        const oldData = await context.env.KV.get(bootstrapKey);
        expect(oldData).not.toBeNull();

        const newKey = serializeKey([newVersion, "post", slug]);
        const newData = await context.env.KV.get(newKey);
        expect(newData).toBeNull();
      });
    });

    describe("getVersioned", () => {
      it("should fetch fresh data when the generation cannot be read", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";
        const schema = z.object({ source: z.string() });
        const staleKey = serializeKey(["v0", "test-versioned"]);
        await context.env.KV.put(staleKey, JSON.stringify({ source: "stale" }));
        vi.spyOn(context.env.KV, "get").mockRejectedValueOnce(
          new Error("KV unavailable"),
        );

        const result = await CacheService.getVersioned(
          context,
          namespace,
          (version) => [version, "test-versioned"],
          schema,
          async () => ({ source: "fresh" }),
        );

        expect(result).toEqual({ source: "fresh" });
      });
    });

    describe("serializeKey utility", () => {
      it("should return string key as-is", () => {
        expect(serializeKey("simple-key")).toBe("simple-key");
      });

      it("should join array elements with colon", () => {
        expect(serializeKey(["a", "b", "c"])).toBe("a:b:c");
      });

      it("should convert numbers and booleans to strings", () => {
        expect(serializeKey(["posts", 123, true])).toBe("posts:123:true");
      });

      it("should replace null and undefined with underscore", () => {
        expect(serializeKey(["posts", null, undefined, "test"])).toBe(
          "posts:_:_:test",
        );
      });
    });
  });

  describe("ConfigService.updateSystemConfig", () => {
    let context: ReturnType<typeof createTestContext>;

    beforeEach(async () => {
      context = createTestContext();
      await ConfigRepo.upsertSystemConfig(context.db, DEFAULT_CONFIG);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("persists updated site settings", async () => {
      await ConfigService.updateSystemConfig(context, {
        ...DEFAULT_CONFIG,
        site: {
          ...DEFAULT_CONFIG.site,
          title: "Updated Site Title",
        },
      });

      const config = await ConfigService.getSystemConfig(context);
      expect(config.site?.title).toBe("Updated Site Title");
    });

    it("migrates legacy Resend config to SMTP fields when reading", async () => {
      await ConfigRepo.upsertSystemConfig(context.db, {
        ...DEFAULT_CONFIG,
        email: {
          apiKey: "re_legacy_key",
          senderName: "Legacy Sender",
          senderAddress: "legacy@example.com",
        },
      });

      const config = await ConfigService.getSystemConfig(context);

      expect(config.email).toEqual({
        host: "smtp.resend.com",
        port: 465,
        username: "resend",
        password: "re_legacy_key",
        senderName: "Legacy Sender",
        senderAddress: "legacy@example.com",
      });
    });

    it("normalizes legacy cached email config on cache hit", async () => {
      await context.env.KV.put(
        "system",
        JSON.stringify({
          ...DEFAULT_CONFIG,
          email: {
            apiKey: "re_cached_key",
            senderName: "Cached Sender",
            senderAddress: "cached@example.com",
          },
        }),
      );

      const config = await ConfigService.getSystemConfig(context);

      expect(config.email).toEqual({
        host: "smtp.resend.com",
        port: 465,
        username: "resend",
        password: "re_cached_key",
        senderName: "Cached Sender",
        senderAddress: "cached@example.com",
      });

      await waitForBackgroundTasks(context.executionCtx);

      const cached = await context.env.KV.get("system", "json");
      expect(cached).toMatchObject({
        email: {
          host: "smtp.resend.com",
          port: 465,
          username: "resend",
          password: "re_cached_key",
          senderName: "Cached Sender",
          senderAddress: "cached@example.com",
        },
      });
      expect(cached).not.toMatchObject({
        email: expect.objectContaining({
          apiKey: expect.anything(),
        }),
      });
    });

    it("stores the normalized SMTP config without legacy apiKey field", async () => {
      await ConfigService.updateSystemConfig(context, {
        ...DEFAULT_CONFIG,
        email: {
          apiKey: "re_legacy_key",
          senderName: "Legacy Sender",
          senderAddress: "legacy@example.com",
        },
      });

      const stored = await ConfigRepo.getSystemConfig(context.db);

      expect(stored?.email).toEqual({
        host: "smtp.resend.com",
        port: 465,
        username: "resend",
        password: "re_legacy_key",
        senderName: "Legacy Sender",
        senderAddress: "legacy@example.com",
      });
      expect(stored?.email).not.toHaveProperty("apiKey");
    });
  });
});
