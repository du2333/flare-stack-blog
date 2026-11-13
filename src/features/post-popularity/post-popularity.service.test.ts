import { describe, expect, it, vi } from "vitest";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { createPostPopularityService } from "./service/post-popularity.service";

describe("post popularity service", () => {
  it("replaces the snapshot and records a successful sync", async () => {
    const writeSnapshot = vi.fn(async () => undefined);
    const writeStatus = vi.fn(async () => undefined);
    const invalidate = vi.fn(async () => undefined);
    const service = createPostPopularityService({
      now: () => new Date("2026-08-23T00:15:00.000Z"),
      resolveConfig: vi.fn(() => ({
        type: "cloud" as const,
        apiUrl: "https://api.umami.is/v1",
        websiteId: "website-id",
        apiKey: "cloud-key",
      })),
      getPathMetrics: vi.fn(async () => [
        { path: "/post/alpha", pageviews: 4 },
      ]),
      getDailyViews: vi.fn(async () => [
        { day: Date.parse("2026-08-22T00:00:00.000Z"), views: 6 },
      ]),
      listPublishedPosts: vi.fn(async () => [
        {
          postId: 1,
          publicSlug: "alpha",
          publishedAt: Date.parse("2026-08-01T00:00:00.000Z"),
        },
      ]),
      readSnapshot: vi.fn(async () => null),
      writeSnapshot,
      readStatus: vi.fn(async () => null),
      writeStatus,
      invalidate,
      getPopularPosts: vi.fn(async () => []),
    });

    const result = await service.sync({
      env: {},
      executionCtx: {},
    } as DbContext & { executionCtx: ExecutionContext });

    expect(result.error).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entries: [{ postId: 1, score: 4 }],
        syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
        daily: [{ day: Date.parse("2026-08-22T00:00:00.000Z"), views: 6 }],
      }),
    );
    expect(writeStatus).toHaveBeenCalledWith(expect.anything(), {
      lastAttemptAt: Date.parse("2026-08-23T00:15:00.000Z"),
      lastSuccessAt: Date.parse("2026-08-23T00:15:00.000Z"),
      lastError: null,
      windowStart: Date.parse("2026-07-24T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-22T23:59:59.999Z"),
    });
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("still replaces the snapshot when the daily series cannot be fetched", async () => {
    const writeSnapshot = vi.fn(async () => undefined);
    const writeStatus = vi.fn(async () => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const service = createPostPopularityService({
      now: () => new Date("2026-08-23T00:15:00.000Z"),
      resolveConfig: vi.fn(() => ({
        type: "cloud" as const,
        apiUrl: "https://api.umami.is/v1",
        websiteId: "website-id",
        apiKey: "cloud-key",
      })),
      getPathMetrics: vi.fn(async () => [
        { path: "/post/alpha", pageviews: 4 },
      ]),
      getDailyViews: vi.fn(async () => {
        throw new Error("pageviews 502");
      }),
      listPublishedPosts: vi.fn(async () => [
        {
          postId: 1,
          publicSlug: "alpha",
          publishedAt: Date.parse("2026-08-01T00:00:00.000Z"),
        },
      ]),
      readSnapshot: vi.fn(async () => null),
      writeSnapshot,
      readStatus: vi.fn(async () => null),
      writeStatus,
      invalidate: vi.fn(async () => undefined),
      getPopularPosts: vi.fn(async () => []),
    });

    const result = await service.sync({
      env: {},
      executionCtx: {},
    } as DbContext & { executionCtx: ExecutionContext });

    expect(result.error).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entries: [{ postId: 1, score: 4 }],
        daily: [],
      }),
    );
    expect(writeStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lastError: null }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({
        message: "post popularity daily views failed",
        error: "pageviews 502",
      }),
    );
    consoleError.mockRestore();
  });

  describe("purging cached pages", () => {
    const previousAt = Date.parse("2026-08-22T00:15:00.000Z");
    const previousSnapshot = {
      entries: [{ postId: 1, score: 4 }],
      windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
      syncedAt: previousAt,
      daily: [],
    };
    const completedStatus = {
      lastAttemptAt: previousAt,
      lastSuccessAt: previousAt,
      lastError: null as string | null,
      windowStart: previousSnapshot.windowStart,
      windowEnd: previousSnapshot.windowEnd,
    };

    async function syncWith({
      pageviews,
      snapshot = previousSnapshot,
      status = completedStatus,
    }: {
      pageviews: number;
      snapshot?: typeof previousSnapshot | null;
      status?: typeof completedStatus | null;
    }) {
      const invalidate = vi.fn(async () => undefined);
      const writeSnapshot = vi.fn(async () => undefined);
      const service = createPostPopularityService({
        now: () => new Date("2026-08-23T00:15:00.000Z"),
        resolveConfig: vi.fn(() => ({
          type: "cloud" as const,
          apiUrl: "https://api.umami.is/v1",
          websiteId: "website-id",
          apiKey: "cloud-key",
        })),
        getPathMetrics: vi.fn(async () => [{ path: "/post/alpha", pageviews }]),
        getDailyViews: vi.fn(async () => []),
        listPublishedPosts: vi.fn(async () => [
          {
            postId: 1,
            publicSlug: "alpha",
            publishedAt: Date.parse("2026-08-01T00:00:00.000Z"),
          },
        ]),
        readSnapshot: vi.fn(async () => snapshot),
        writeSnapshot,
        readStatus: vi.fn(async () => status),
        writeStatus: vi.fn(async () => undefined),
        invalidate,
        getPopularPosts: vi.fn(async () => []),
      });
      const result = await service.sync({
        env: {},
        executionCtx: {},
      } as DbContext & { executionCtx: ExecutionContext });
      return { result, invalidate, writeSnapshot };
    }

    it("purges when a visible score changed", async () => {
      const { invalidate } = await syncWith({ pageviews: 5 });
      expect(invalidate).toHaveBeenCalledOnce();
    });

    it("still replaces the snapshot but skips the purge when nothing visible changed", async () => {
      const { result, invalidate, writeSnapshot } = await syncWith({
        pageviews: 4,
      });
      expect(result.error).toBeNull();
      expect(writeSnapshot).toHaveBeenCalledOnce();
      expect(invalidate).not.toHaveBeenCalled();
    });

    it("purges when the previous sync did not finish its purge", async () => {
      const { invalidate } = await syncWith({
        pageviews: 4,
        status: { ...completedStatus, lastError: "purge failed" },
      });
      expect(invalidate).toHaveBeenCalledOnce();
    });

    it("purges when the previous sync left no record", async () => {
      const { invalidate } = await syncWith({ pageviews: 4, status: null });
      expect(invalidate).toHaveBeenCalledOnce();
    });

    it("purges when there was no previous snapshot", async () => {
      const { invalidate } = await syncWith({ pageviews: 4, snapshot: null });
      expect(invalidate).toHaveBeenCalledOnce();
    });
  });

  it("keeps the previous success metadata when a sync fails", async () => {
    const writeStatus = vi.fn(async () => undefined);
    const service = createPostPopularityService({
      now: () => new Date("2026-08-23T00:15:00.000Z"),
      resolveConfig: vi.fn(() => {
        throw new Error("Umami API credentials are not configured");
      }),
      getPathMetrics: vi.fn(),
      getDailyViews: vi.fn(),
      listPublishedPosts: vi.fn(),
      readSnapshot: vi.fn(async () => null),
      writeSnapshot: vi.fn(),
      readStatus: vi.fn(async () => ({
        lastAttemptAt: Date.parse("2026-08-22T00:15:00.000Z"),
        lastSuccessAt: Date.parse("2026-08-22T00:15:00.000Z"),
        lastError: null,
        windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
        windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
      })),
      writeStatus,
      invalidate: vi.fn(),
      getPopularPosts: vi.fn(async () => []),
    });

    const result = await service.sync({
      env: {},
      executionCtx: {},
    } as DbContext & { executionCtx: ExecutionContext });

    expect(result).toEqual({ data: null, error: { reason: "SYNC_FAILED" } });
    expect(writeStatus).toHaveBeenCalledWith(expect.anything(), {
      lastAttemptAt: Date.parse("2026-08-23T00:15:00.000Z"),
      lastSuccessAt: Date.parse("2026-08-22T00:15:00.000Z"),
      lastError: "Umami API credentials are not configured",
      windowStart: Date.parse("2026-07-24T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-22T23:59:59.999Z"),
    });
  });

  it("uses a fresh snapshot to load Posts in ranked order", async () => {
    const getPopularPosts = vi.fn(
      async (): Promise<PostItem[]> =>
        [{ id: 7 }, { id: 3 }] as Array<PostItem>,
    );
    const syncedAt = Date.parse("2026-08-22T00:15:00.000Z");
    const service = createPostPopularityService({
      now: () => new Date("2026-08-23T00:15:00.000Z"),
      resolveConfig: vi.fn(),
      getPathMetrics: vi.fn(),
      getDailyViews: vi.fn(),
      listPublishedPosts: vi.fn(),
      readSnapshot: vi.fn(async () => ({
        entries: [
          { postId: 7, score: 12 },
          { postId: 3, score: 8 },
        ],
        windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
        windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
        syncedAt,
        daily: [],
      })),
      writeSnapshot: vi.fn(),
      readStatus: vi.fn(),
      writeStatus: vi.fn(),
      invalidate: vi.fn(),
      getPopularPosts,
    });
    const context = { env: {} } as DbContext & {
      executionCtx: ExecutionContext;
    };

    await expect(service.getPopular(context, 2)).resolves.toEqual([
      { id: 7, viewCount: 12 },
      { id: 3, viewCount: 8 },
    ]);
    expect(getPopularPosts).toHaveBeenCalledWith(context, {
      limit: 2,
      snapshotVersion: syncedAt,
      postIds: [7, 3],
    });
  });

  it("ignores a snapshot older than seven days", async () => {
    const getPopularPosts = vi.fn(async () => []);
    const service = createPostPopularityService({
      now: () => new Date("2026-08-30T00:15:00.001Z"),
      resolveConfig: vi.fn(),
      getPathMetrics: vi.fn(),
      getDailyViews: vi.fn(),
      listPublishedPosts: vi.fn(),
      readSnapshot: vi.fn(async () => ({
        entries: [{ postId: 7, score: 12 }],
        windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
        windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
        syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
        daily: [],
      })),
      writeSnapshot: vi.fn(),
      readStatus: vi.fn(),
      writeStatus: vi.fn(),
      invalidate: vi.fn(),
      getPopularPosts,
    });

    await expect(
      service.getPopular(
        { env: {} } as DbContext & { executionCtx: ExecutionContext },
        2,
      ),
    ).resolves.toEqual([]);
    expect(getPopularPosts).not.toHaveBeenCalled();
  });
});
