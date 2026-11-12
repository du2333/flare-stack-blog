import { describe, expect, it } from "vitest";
import { PostPopularitySnapshotSchema } from "./post-popularity.schema";
import {
  buildPostPopularitySnapshot,
  getPostPopularityWindow,
  isPostPopularitySnapshotUsable,
  isPostPopularityUnchanged,
  postSlugFromPath,
  withViewCounts,
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

  it("keeps the daily series with the snapshot, empty when none is given", () => {
    const base = {
      metrics: [],
      posts: [],
      window: {
        startAt: Date.parse("2026-07-24T00:00:00.000Z"),
        endAt: Date.parse("2026-08-22T23:59:59.999Z"),
      },
      syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
    };
    const daily = [{ day: Date.parse("2026-07-24T00:00:00.000Z"), views: 3 }];

    expect(buildPostPopularitySnapshot({ ...base, daily }).daily).toEqual(
      daily,
    );
    expect(buildPostPopularitySnapshot(base).daily).toEqual([]);
  });

  it("reads a snapshot stored before the daily series existed", () => {
    const stored = {
      entries: [{ postId: 1, score: 2 }],
      windowStart: 1,
      windowEnd: 2,
      syncedAt: 3,
    };
    expect(PostPopularitySnapshotSchema.parse(stored).daily).toEqual([]);
  });

  it("expires a snapshot after seven days", () => {
    const snapshot = {
      entries: [{ postId: 1, score: 2 }],
      windowStart: Date.parse("2026-07-24T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-22T23:59:59.999Z"),
      syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
      daily: [],
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

  it("attaches snapshot scores to posts when the snapshot is usable", () => {
    const snapshot = {
      entries: [{ postId: 1, score: 9 }],
      windowStart: Date.parse("2026-07-24T00:00:00.000Z"),
      windowEnd: Date.parse("2026-08-22T23:59:59.999Z"),
      syncedAt: Date.parse("2026-08-23T00:15:00.000Z"),
      daily: [],
    };
    const now = Date.parse("2026-08-23T12:00:00.000Z");

    expect(withViewCounts([{ id: 1 }, { id: 2 }], snapshot, now)).toEqual([
      { id: 1, viewCount: 9 },
      { id: 2, viewCount: 0 },
    ]);
    expect(
      withViewCounts([{ id: 1 }], snapshot, now + 8 * 24 * 60 * 60 * 1000),
    ).toEqual([{ id: 1 }]);
  });
});

describe("isPostPopularityUnchanged", () => {
  const snapshot = (
    entries: Array<{ postId: number; score: number }>,
    syncedAt = Date.parse("2026-08-22T00:15:00.000Z"),
  ) => ({ entries, windowStart: 0, windowEnd: 0, syncedAt, daily: [] });
  const now = Date.parse("2026-08-23T00:15:00.000Z");

  it("matches the same posts, scores and order", () => {
    const entries = [
      { postId: 2, score: 12 },
      { postId: 1, score: 4 },
    ];
    expect(
      isPostPopularityUnchanged(snapshot(entries), snapshot(entries), now),
    ).toBe(true);
    expect(isPostPopularityUnchanged(snapshot([]), snapshot([]), now)).toBe(
      true,
    );
  });

  it("ignores the daily series", () => {
    const entries = [{ postId: 1, score: 4 }];
    expect(
      isPostPopularityUnchanged(
        snapshot(entries),
        { ...snapshot(entries), daily: [{ day: 0, views: 9 }] },
        now,
      ),
    ).toBe(true);
  });

  it("differs when a score, the order or the post set changes", () => {
    const previous = snapshot([
      { postId: 2, score: 12 },
      { postId: 1, score: 4 },
    ]);
    expect(
      isPostPopularityUnchanged(
        previous,
        snapshot([
          { postId: 2, score: 13 },
          { postId: 1, score: 4 },
        ]),
        now,
      ),
    ).toBe(false);
    expect(
      isPostPopularityUnchanged(
        previous,
        snapshot([
          { postId: 1, score: 4 },
          { postId: 2, score: 12 },
        ]),
        now,
      ),
    ).toBe(false);
    expect(
      isPostPopularityUnchanged(
        previous,
        snapshot([{ postId: 2, score: 12 }]),
        now,
      ),
    ).toBe(false);
  });

  it("never matches a missing or expired previous snapshot", () => {
    const entries = [{ postId: 1, score: 4 }];
    expect(isPostPopularityUnchanged(null, snapshot(entries), now)).toBe(false);
    expect(
      isPostPopularityUnchanged(
        snapshot(entries, Date.parse("2026-08-10T00:15:00.000Z")),
        snapshot(entries),
        now,
      ),
    ).toBe(false);
  });
});
