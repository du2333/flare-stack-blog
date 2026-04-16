import { createTestContext, waitForBackgroundTasks } from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import { serializeKey } from "@/features/cache/cache.utils";
import type { CacheNamespace } from "@/features/cache/types";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as ConfigService from "@/features/config/service/config.service";
import * as Invalidate from "@/lib/invalidate";

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
      it("should return 'v1' when no version exists", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("v1");
      });

      it("should return formatted version when version exists", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";

        // Pre-set version to 5
        await context.env.KV.put(`ver:${namespace}`, "5");

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("v5");
      });

      it("should return 'v1' when version is not a valid number", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        // Pre-set invalid version
        await context.env.KV.put(`ver:${namespace}`, "invalid");

        const version = await CacheService.getVersion(context, namespace);

        expect(version).toBe("v1");
      });
    });

    describe("bumpVersion", () => {
      it("should set version to 1 when no version exists", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        await CacheService.bumpVersion(context, namespace);

        const stored = await context.env.KV.get(`ver:${namespace}`);
        expect(stored).toBe("1");
      });

      it("should increment existing version", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";

        // Pre-set version to 3
        await context.env.KV.put(`ver:${namespace}`, "3");

        await CacheService.bumpVersion(context, namespace);

        const stored = await context.env.KV.get(`ver:${namespace}`);
        expect(stored).toBe("4");
      });

      it("should reset to 1 when version is invalid", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:list";

        // Pre-set invalid version
        await context.env.KV.put(`ver:${namespace}`, "not-a-number");

        await CacheService.bumpVersion(context, namespace);

        const stored = await context.env.KV.get(`ver:${namespace}`);
        expect(stored).toBe("1");
      });

      it("should correctly invalidate old cache keys", async () => {
        const context = createTestContext();
        const namespace: CacheNamespace = "posts:detail";
        const slug = "test-post";

        // Simulate pre-existing cached data with v1
        const v1Key = serializeKey(["v1", "post", slug]);
        await context.env.KV.put(v1Key, JSON.stringify({ title: "Old Data" }));

        // Bump version
        await CacheService.bumpVersion(context, namespace);

        // New cache reads would use v2, old v1 key is effectively orphaned
        const newVersion = await CacheService.getVersion(context, namespace);
        expect(newVersion).toBe("v1"); // First bump sets to 1, so version is v1

        // Bump again
        await CacheService.bumpVersion(context, namespace);
        const bumpedVersion = await CacheService.getVersion(context, namespace);
        expect(bumpedVersion).toBe("v2");

        // Old v1 key still exists but is unreachable with v2 version
        const oldData = await context.env.KV.get(v1Key);
        expect(oldData).not.toBeNull(); // Still exists

        // New v2 key doesn't exist yet
        const v2Key = serializeKey(["v2", "post", slug]);
        const newData = await context.env.KV.get(v2Key);
        expect(newData).toBeNull();
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

    it("purges site CDN cache when site settings change", async () => {
      const purgeSiteCDNCacheSpy = vi
        .spyOn(Invalidate, "purgeSiteCDNCache")
        .mockResolvedValue();

      await ConfigService.updateSystemConfig(context, {
        ...DEFAULT_CONFIG,
        site: {
          ...DEFAULT_CONFIG.site,
          title: "Updated Site Title",
        },
      });

      expect(purgeSiteCDNCacheSpy).toHaveBeenCalledOnce();
      expect(purgeSiteCDNCacheSpy).toHaveBeenCalledWith(context.env);
    });

    it("does not purge site CDN cache when only non-site settings change", async () => {
      const purgeSiteCDNCacheSpy = vi
        .spyOn(Invalidate, "purgeSiteCDNCache")
        .mockResolvedValue();

      await ConfigService.updateSystemConfig(context, {
        ...DEFAULT_CONFIG,
        email: {
          ...DEFAULT_CONFIG.email,
          senderName: "Updated Sender",
        },
      });

      expect(purgeSiteCDNCacheSpy).not.toHaveBeenCalled();
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
