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
const FRIEND_LINKS_TAG = "friend-links";

const SITE_DOCUMENTS_WITH_POSTS = new Set([
  "/atom.xml",
  "/rss.xml",
  "/feed.json",
  "/sitemap.xml",
]);

const SITE_DOCUMENTS_HTML_ONLY = new Set(["/robots.txt", "/site.webmanifest"]);

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function postCacheTag(slug: string): string {
  return `post:${encodeURIComponent(slug)}`;
}

export function workersCacheKey(url: string | URL): string {
  const parsed = typeof url === "string" ? new URL(url) : url;
  const pathname = parsed.pathname;
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
    return { cache: "public", tags: [HTML_TAG, POSTS_TAG] };
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
  if (SITE_DOCUMENTS_HTML_ONLY.has(path)) {
    return { cache: "public", tags: [HTML_TAG] };
  }
  if (path === "/stats.js") {
    return { cache: "public", tags: [] };
  }
  if (path.startsWith("/images/")) {
    return { cache: "public", tags: [] };
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
  params: { slug?: string; slugs?: string[] },
): WorkersCachePurgeTarget {
  if (reason === "all") {
    return { purgeEverything: true };
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
