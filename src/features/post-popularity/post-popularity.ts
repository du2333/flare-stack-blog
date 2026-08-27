import {
  PostPopularitySnapshotSchema,
  type PostPopularitySnapshot,
} from "./post-popularity.schema";

const DAY_MS = 24 * 60 * 60 * 1000;
export const POST_POPULARITY_WINDOW_DAYS = 30;
export const POST_POPULARITY_MAX_AGE_MS = 7 * DAY_MS;

export type PostPopularityWindow = {
  startAt: number;
  endAt: number;
};

export type PostPopularityMetric = {
  path: string;
  pageviews: number;
};

export type PublishedPostPopularityRef = {
  postId: number;
  publicSlug: string;
  publishedAt: number;
};

export function getPostPopularityWindow(now: Date): PostPopularityWindow {
  const todayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return {
    startAt: todayStart - POST_POPULARITY_WINDOW_DAYS * DAY_MS,
    endAt: todayStart - 1,
  };
}

export function postSlugFromPath(path: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(path, "https://blog.invalid").pathname;
  } catch {
    return null;
  }

  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const match = /^\/post\/([^/]+)$/.exec(normalized);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function buildPostPopularitySnapshot({
  metrics,
  posts,
  window,
  syncedAt,
}: {
  metrics: PostPopularityMetric[];
  posts: PublishedPostPopularityRef[];
  window: PostPopularityWindow;
  syncedAt: number;
}): PostPopularitySnapshot {
  const postBySlug = new Map(posts.map((post) => [post.publicSlug, post]));
  const scoreByPostId = new Map<number, number>();

  for (const metric of metrics) {
    if (!Number.isFinite(metric.pageviews) || metric.pageviews <= 0) continue;
    const slug = postSlugFromPath(metric.path);
    if (!slug) continue;
    const post = postBySlug.get(slug);
    if (!post) continue;
    scoreByPostId.set(
      post.postId,
      (scoreByPostId.get(post.postId) ?? 0) + Math.floor(metric.pageviews),
    );
  }

  const publishedAtByPostId = new Map(
    posts.map((post) => [post.postId, post.publishedAt]),
  );
  const entries = [...scoreByPostId.entries()]
    .map(([postId, score]) => ({ postId, score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (publishedAtByPostId.get(b.postId) ?? 0) -
          (publishedAtByPostId.get(a.postId) ?? 0) ||
        b.postId - a.postId,
    );

  return PostPopularitySnapshotSchema.parse({
    entries,
    windowStart: window.startAt,
    windowEnd: window.endAt,
    syncedAt,
  });
}

export function isPostPopularitySnapshotUsable(
  snapshot: PostPopularitySnapshot,
  now = Date.now(),
): boolean {
  return now - snapshot.syncedAt <= POST_POPULARITY_MAX_AGE_MS;
}
