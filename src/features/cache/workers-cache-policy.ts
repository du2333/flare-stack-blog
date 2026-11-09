import { CACHE_CONTROL } from "@/lib/constants";
import type { PublicCacheReason } from "./types";

export type WorkersCachePolicy =
  | { cache: "private" }
  | { cache: "public"; tags: readonly string[] };

export type WorkersCachePurgeTarget =
  | { tags: string[] }
  | { purgeEverything: true };

const HTML_TAG = "html";
const POSTS_TAG = "posts";
// Only the pages that render view counts or the popular ranking.
const POPULARITY_TAG = "popularity";
const FRIEND_LINKS_TAG = "friend-links";
// The Moments list pages, the home sidebar's latest Moments, the Moments feeds
// and the Moments in the sitemap.
const MOMENTS_TAG = "moments";

const SITE_DOCUMENTS_WITH_POSTS = new Set([
  "/atom.xml",
  "/rss.xml",
  "/feed.json",
]);

const SITE_DOCUMENTS_WITH_MOMENTS = new Set([
  "/moments/atom.xml",
  "/moments/rss.xml",
  "/moments/feed.json",
]);

const SITE_DOCUMENTS_HTML_ONLY = new Set(["/robots.txt", "/site.webmanifest"]);

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function postCacheTag(slug: string): string {
  return `post:${encodeURIComponent(slug)}`;
}

// A Moment's own page. Moment ids are never reused, so a deleted Moment's
// page cannot come back under another.
function momentCacheTag(id: number | string): string {
  return `moment:${id}`;
}

// Every cached response for one Media key, original and transforms alike.
function mediaCacheTag(key: string): string {
  return `media:${encodeURIComponent(key)}`;
}

export function workersCacheKey(url: string | URL): string {
  const parsed = typeof url === "string" ? new URL(url) : url;
  const pathname = parsed.pathname;
  if (pathname === "/" || normalizePathname(pathname) === "/moments") {
    const page = parsed.searchParams.get("page");
    return page && page !== "1"
      ? `${pathname}?${new URLSearchParams({ page })}`
      : pathname;
  }
  if (normalizePathname(pathname) === "/posts") {
    const params = new URLSearchParams();
    const tagName = parsed.searchParams.get("tagName");
    const categoryName = parsed.searchParams.get("categoryName");
    const uncategorized = parsed.searchParams.get("uncategorized");
    if (tagName) params.set("tagName", tagName);
    if (categoryName) params.set("categoryName", categoryName);
    if (uncategorized === "true") params.set("uncategorized", "true");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }
  if (pathname.startsWith("/images/")) {
    const params = new URLSearchParams();
    for (const name of ["original", "quality", "width", "height", "fit", "v"]) {
      const value = parsed.searchParams.get(name);
      if (value) params.set(name, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }
  return pathname;
}

export function workersCachePolicy(pathname: string): WorkersCachePolicy {
  const path = normalizePathname(pathname);

  if (path === "/") {
    return {
      cache: "public",
      tags: [HTML_TAG, POSTS_TAG, POPULARITY_TAG, MOMENTS_TAG],
    };
  }
  if (path === "/moments") {
    return { cache: "public", tags: [HTML_TAG, MOMENTS_TAG] };
  }
  if (path === "/posts") {
    return { cache: "public", tags: [HTML_TAG, POSTS_TAG] };
  }
  if (path === "/friend-links") {
    return { cache: "public", tags: [HTML_TAG, FRIEND_LINKS_TAG] };
  }
  if (path === "/search") {
    return { cache: "public", tags: [HTML_TAG] };
  }
  if (SITE_DOCUMENTS_WITH_POSTS.has(path)) {
    return { cache: "public", tags: [HTML_TAG, POSTS_TAG] };
  }
  if (path === "/sitemap.xml") {
    return { cache: "public", tags: [HTML_TAG, POSTS_TAG, MOMENTS_TAG] };
  }
  if (SITE_DOCUMENTS_WITH_MOMENTS.has(path)) {
    return { cache: "public", tags: [HTML_TAG, MOMENTS_TAG] };
  }
  if (SITE_DOCUMENTS_HTML_ONLY.has(path)) {
    return { cache: "public", tags: [HTML_TAG] };
  }
  if (path === "/stats.js") {
    return { cache: "public", tags: [] };
  }
  if (path.startsWith("/images/")) {
    // The image route reads the key from the raw path, as here.
    const key = path.slice("/images/".length);
    return { cache: "public", tags: key ? [mediaCacheTag(key)] : [] };
  }

  const momentMatch = /^\/moments\/(.+)$/.exec(path);
  if (momentMatch?.[1]) {
    // Only an id names a Moment; any other address is a page no Moment has,
    // dropped with the lists.
    return {
      cache: "public",
      tags: /^[1-9][0-9]*$/.test(momentMatch[1])
        ? [HTML_TAG, momentCacheTag(momentMatch[1])]
        : [HTML_TAG, MOMENTS_TAG],
    };
  }

  const postMatch = /^\/post\/(.+)$/.exec(path);
  if (postMatch?.[1]) {
    return {
      cache: "public",
      tags: [
        HTML_TAG,
        POSTS_TAG,
        postCacheTag(decodeURIComponent(postMatch[1])),
      ],
    };
  }

  return { cache: "private" };
}

export function purgeOptionsFor(
  reason: PublicCacheReason | "all",
  params: {
    slug?: string;
    slugs?: string[];
    momentId?: number;
    navigationChanged?: boolean;
  },
): WorkersCachePurgeTarget {
  if (reason === "all") {
    return { purgeEverything: true };
  }
  if (reason === "moment.changed") {
    // Going from no Moments to some, or back, shows or hides Moments in the
    // navigation of every page; every page with it carries the html tag, the
    // Moments pages and the home page among them. Otherwise only the lists,
    // the home sidebar and the Moment's own page show it.
    if (params.navigationChanged) return { tags: [HTML_TAG] };
    return {
      tags: [
        MOMENTS_TAG,
        ...(params.momentId === undefined
          ? []
          : [momentCacheTag(params.momentId)]),
      ],
    };
  }
  if (reason === "post-popularity.updated") {
    return { tags: [POPULARITY_TAG] };
  }
  if (reason === "site-config.changed") {
    return { tags: [HTML_TAG] };
  }
  if (reason === "friend-links.changed") {
    return { tags: [FRIEND_LINKS_TAG] };
  }
  if (reason === "tag.changed" || reason === "category.changed") {
    const slugs = params.slugs ?? (params.slug ? [params.slug] : []);
    return {
      tags: [...new Set([POSTS_TAG, ...slugs.map(postCacheTag)])],
    };
  }
  if (params.slug) {
    return { tags: [POSTS_TAG, postCacheTag(params.slug)] };
  }
  return { tags: [POSTS_TAG] };
}

/**
 * Replacing a Media file keeps its key and every address that names it, so
 * the cached copies of that key go instead (ADR 0009 purges by Cache-Tag).
 */
export function mediaPurgeTarget(key: string): WorkersCachePurgeTarget {
  return { tags: [mediaCacheTag(key)] };
}

export function applyWorkersCachePolicy(
  request: Request,
  response: Response,
): Response {
  const policy = workersCachePolicy(new URL(request.url).pathname);
  const headers = new Headers(response.headers);

  if (policy.cache === "private") {
    headers.set("Cache-Control", CACHE_CONTROL.private["Cache-Control"]);
    headers.set(
      "CDN-Cache-Control",
      CACHE_CONTROL.private["CDN-Cache-Control"],
    );
    headers.delete("Cache-Tag");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (policy.tags.length > 0) {
    headers.set("Cache-Tag", policy.tags.join(","));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
