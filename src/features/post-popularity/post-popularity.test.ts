import { describe, expect, it } from "vitest";
import {
  buildPostPopularitySnapshot,
  getPostPopularityWindow,
  isPostPopularitySnapshotUsable,
  postSlugFromPath,
} from "./post-popularity";

describe("post popularity", () => {
  it("uses the previous 30 complete UTC calendar days", () => {
    const window = getPostPopularityWindow(
      new Date("2026-08-23T00:15:00.000Z"),
    );

    expect(window).toEqual({
      startAt: Date.parse("2026-07-24T00:00:00.000Z"),
      endAt: Date.parse("2026-08-22T23:59:59.999Z"),
    });
  });

  it.each([
    ["/post/hello", "hello"],
    ["/post/hello/", "hello"],
    ["/post/hello?comment=9", "hello"],
    ["https://blog.example/post/%E4%BD%A0%E5%A5%BD", "你好"],
    ["/admin/posts", null],
    ["/post/hello/replies", null],
    ["/posts", null],
  ])("maps public path %s to slug %s", (path, slug) => {
    expect(postSlugFromPath(path)).toBe(slug);
  });

  it("maps metrics to current published posts and orders ties by publish time", () => {
    const snapshot = buildPostPopularitySnapshot({
      metrics: [
        { path: "/post/alpha", pageviews: 10 },
        { path: "/post/alpha/", pageviews: 2 },
        { path: "/post/beta", pageviews: 12 },
        { path: "/post/gamma", pageviews: 0 },
        { path: "/post/old-alpha", pageviews: 99 },
      ],
      posts: [
        {
          postId: 1,
          publicSlug: "alpha",
          publishedAt: Date.parse("2026-08-01T00:00:00.000Z"),
        },
        {
          postId: 2,
          publicSlug: "beta",
          publishedAt: Date.parse("2026-08-02T00:00:00.000Z"),
        },
        {
          postId: 3,
          publicSlug: "gamma",
          publishedAt: Date.parse("2026-08-03T00:00:00.000Z"),
        },
      ],
      window: {
        startAt: Date.parse("2026-07-24T00:00:00.000Z"),
        endAt: Date.parse("2026-08-22T23:59:59.999Z"),
      },
      syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
    });

    expect(snapshot.entries).toEqual([
      { postId: 2, score: 12 },
      { postId: 1, score: 12 },
    ]);
  });

  it("expires a snapshot after seven days", () => {
    const snapshot = {
      entries: [{ postId: 1, score: 2 }],
      windowStart: Date.parse("2026-07-24T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-22T23:59:59.999Z"),
      syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
    };

    expect(
      isPostPopularitySnapshotUsable(
        snapshot,
        Date.parse("2026-08-30T00:15:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isPostPopularitySnapshotUsable(
        snapshot,
        Date.parse("2026-08-30T00:15:00.001Z"),
      ),
    ).toBe(false);
  });
});
