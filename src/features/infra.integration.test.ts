import { seedSystemConfig } from "tests/config-fixture";
import { createTestContext, waitForBackgroundTasks } from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as kvStore from "@/features/cache/kv-store";
import { defineEntry, invalidate } from "@/features/cache/public-cache";
import { serializeKey } from "@/features/cache/serialize";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as ConfigService from "@/features/config/service/config.service";

const widgetSchema = z.object({ name: z.string(), value: z.number() });

const testWidget = defineEntry({
  name: "test.widget",
  namespace: "test:widget",
  address: ["slug"],
  key: ({ slug }: { slug: string }) => ["widget", slug],
  schema: widgetSchema,
  ttl: "1h",
  invalidatedBy: ["post.published"],
  load: async (_context, { slug }) => ({ name: `fresh-${slug}`, value: 1 }),
});

const testList = defineEntry({
  name: "test.list",
  namespace: "test:list",
  key: (_params: Record<string, never>) => ["list"],
  schema: z.array(z.string()),
  ttl: "1h",
  invalidatedBy: ["post.published"],
  load: async () => ["fresh"],
});

describe("Infra Integration", () => {
  describe("kvStore.remember", () => {
    it("should return cached data on cache hit", async () => {
      const context = createTestContext();
      const key = "test-cache-key";
      const cachedData = { name: "cached", value: 123 };
      const schema = z.object({ name: z.string(), value: z.number() });

      await context.env.KV.put(key, JSON.stringify(cachedData));

      const fetcher = vi.fn().mockResolvedValue({ name: "fresh", value: 999 });

      const result = await kvStore.remember(context, key, schema, fetcher);

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should fetch and cache data on cache miss", async () => {
      const context = createTestContext();
      const key = "test-miss-key";
      const freshData = { name: "fresh", value: 456 };
      const schema = z.object({ name: z.string(), value: z.number() });

      const fetcher = vi.fn().mockResolvedValue(freshData);

      const result = await kvStore.remember(context, key, schema, fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledOnce();
      await waitForBackgroundTasks(context.executionCtx);
    });

    it("should re-fetch when cached data fails schema validation", async () => {
      const context = createTestContext();
      const key = "test-invalid-schema-key";
      const invalidData = { invalid: "data" };
      const validData = { name: "valid", count: 10 };
      const schema = z.object({ name: z.string(), count: z.number() });

      await context.env.KV.put(key, JSON.stringify(invalidData));

      const fetcher = vi.fn().mockResolvedValue(validData);

      const result = await kvStore.remember(context, key, schema, fetcher);

      expect(result).toEqual(validData);
      expect(fetcher).toHaveBeenCalledOnce();
      await waitForBackgroundTasks(context.executionCtx);
    });

    it("should return null/undefined without caching when fetcher returns null", async () => {
      const context = createTestContext();
      const key = "test-null-key";
      const schema = z.object({ name: z.string() }).nullable();

      const fetcher = vi.fn().mockResolvedValue(null);

      const result = await kvStore.remember(context, key, schema, fetcher);

      expect(result).toBeNull();
      expect(fetcher).toHaveBeenCalledOnce();

      const cached = await context.env.KV.get(key);
      expect(cached).toBeNull();
    });

    it("should support array-based cache keys", async () => {
      const context = createTestContext();
      const key = ["v1", "posts", "my-slug"] as const;
      const data = { title: "Test Post" };
      const schema = z.object({ title: z.string() });

      const fetcher = vi.fn().mockResolvedValue(data);

      await kvStore.remember(context, key, schema, fetcher);
      await waitForBackgroundTasks(context.executionCtx);

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
      const schema = z.object({
        title: z.string(),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      });

      const fetcher = vi.fn().mockResolvedValue(data);

      const result1 = await kvStore.remember(context, key, schema, fetcher);
      expect(result1.title).toBe("Post with Date");
      expect(result1.publishedAt).toEqual(publishedAt);
      expect(result1.publishedAt).toBeInstanceOf(Date);

      await waitForBackgroundTasks(context.executionCtx);

      const result2 = await kvStore.remember(context, key, schema, fetcher);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(result2.title).toBe("Post with Date");
      expect(result2.publishedAt).toEqual(publishedAt);
      expect(result2.publishedAt).toBeInstanceOf(Date);
      expect(result2.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("kvStore.get/put/remove", () => {
    it("should return raw string value from cache", async () => {
      const context = createTestContext();
      const key = "raw-test-key";
      const value = "raw-string-value";

      await context.env.KV.put(key, value);

      const result = await kvStore.get(context, key);

      expect(result).toBe(value);
    });

    it("should return null for non-existent key", async () => {
      const context = createTestContext();
      const result = await kvStore.get(context, "non-existent-key");
      expect(result).toBeNull();
    });

    it("should support array-based cache keys", async () => {
      const context = createTestContext();
      const key = ["hash", "post-123"] as const;
      const value = "abc123hash";

      await context.env.KV.put(serializeKey(key), value);

      const result = await kvStore.get(context, key);

      expect(result).toBe(value);
    });

    it("should store value in cache", async () => {
      const context = createTestContext();
      const key = "set-test-key";
      const value = JSON.stringify({ data: "test" });

      await kvStore.put(context, key, value);

      const stored = await context.env.KV.get(key);
      expect(stored).toBe(value);
    });

    it("should set TTL when provided", async () => {
      const context = createTestContext();
      const key = "ttl-test-key";
      const value = "ttl-value";

      await expect(
        kvStore.put(context, key, value, { ttl: "1h" }),
      ).resolves.not.toThrow();

      const stored = await context.env.KV.get(key);
      expect(stored).toBe(value);
    });

    it("should delete a single key", async () => {
      const context = createTestContext();
      const key = "delete-single-key";

      await context.env.KV.put(key, "value");
      await kvStore.remove(context, key);

      const result = await context.env.KV.get(key);
      expect(result).toBeNull();
    });

    it("should delete multiple keys", async () => {
      const context = createTestContext();
      const keys = ["delete-key-1", "delete-key-2", "delete-key-3"];

      await Promise.all(keys.map((k) => context.env.KV.put(k, "value")));
      await kvStore.remove(context, ...keys);

      const results = await Promise.all(keys.map((k) => context.env.KV.get(k)));
      expect(results).toEqual([null, null, null]);
    });

    it("should not throw when deleting non-existent keys", async () => {
      const context = createTestContext();
      await expect(
        kvStore.remove(context, "non-existent-delete-key"),
      ).resolves.not.toThrow();
    });
  });

  describe("public cache", () => {
    it("should cache an addressed entry and invalidate that key on publish", async () => {
      const context = createTestContext();
      const first = await testWidget.get(context, { slug: "a" });
      expect(first).toEqual({ name: "fresh-a", value: 1 });
      await waitForBackgroundTasks(context.executionCtx);

      await context.env.KV.put(
        "v0:widget:a",
        JSON.stringify({ name: "stale-a", value: 9 }),
      );

      const cached = await testWidget.get(context, { slug: "a" });
      expect(cached).toEqual({ name: "stale-a", value: 9 });

      await invalidate.postPublished(context, { slug: "a" });

      const after = await testWidget.get(context, { slug: "a" });
      expect(after).toEqual({ name: "fresh-a", value: 1 });
    });

    it("should bump a list namespace on publish so the old generation is unreachable", async () => {
      const context = createTestContext();
      await testList.get(context, {});
      await waitForBackgroundTasks(context.executionCtx);

      await context.env.KV.put("v0:list", JSON.stringify(["stale"]));
      expect(await testList.get(context, {})).toEqual(["stale"]);

      await invalidate.postPublished(context, { slug: "anything" });

      const after = await testList.get(context, {});
      expect(after).toEqual(["fresh"]);
    });

    it("should load through when generation cannot be read", async () => {
      const context = createTestContext();
      await context.env.KV.put("v0:list", JSON.stringify(["stale"]));
      vi.spyOn(context.env.KV, "get").mockRejectedValueOnce(
        new Error("KV unavailable"),
      );

      const result = await testList.get(context, {});
      expect(result).toEqual(["fresh"]);
    });

    it("invalidate.all should drop singleton and namespaced public entries", async () => {
      const context = createTestContext();
      await testList.get(context, {});
      await waitForBackgroundTasks(context.executionCtx);
      await context.env.KV.put("v0:list", JSON.stringify(["stale"]));

      await invalidate.all(context);

      const after = await testList.get(context, {});
      expect(after).toEqual(["fresh"]);
    });

    it("should purge Workers Cache tags when a post is published", async () => {
      const context = createTestContext();
      await invalidate.postPublished(context, { slug: "hello" });
      expect(vi.mocked(purgeWorkersCache).mock.calls.at(-1)?.slice(1)).toEqual([
        { tags: ["posts", "post:hello"] },
      ]);
    });

    it("should fail invalidate when Workers Cache purge is rejected", async () => {
      vi.mocked(purgeWorkersCache).mockRejectedValueOnce(
        new Error(
          JSON.stringify({
            message: "workers cache purge failed",
            errors: [{ code: 1, message: "rate limited" }],
          }),
        ),
      );
      const context = createTestContext();
      await expect(
        invalidate.postPublished(context, { slug: "hello" }),
      ).rejects.toThrow("workers cache purge failed");
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
        section: "site",
        expectedRevision: (await ConfigService.getAdminConfig(context))
          .revisions.site,
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
      await seedSystemConfig(context, {
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
