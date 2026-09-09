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

  it("keeps the previous success metadata when a sync fails", async () => {
    const writeStatus = vi.fn(async () => undefined);
    const service = createPostPopularityService({
      now: () => new Date("2026-08-23T00:15:00.000Z"),
      resolveConfig: vi.fn(() => {
        throw new Error("Umami API credentials are not configured");
      }),
      getPathMetrics: vi.fn(),
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
      listPublishedPosts: vi.fn(),
      readSnapshot: vi.fn(async () => ({
        entries: [
          { postId: 7, score: 12 },
          { postId: 3, score: 8 },
        ],
        windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
        windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
        syncedAt,
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
      listPublishedPosts: vi.fn(),
      readSnapshot: vi.fn(async () => ({
        entries: [{ postId: 7, score: 12 }],
        windowStart: Date.parse("2026-07-23T00:00:00.000Z"),
        windowEnd: Date.parse("2026-08-21T23:59:59.999Z"),
        syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
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
