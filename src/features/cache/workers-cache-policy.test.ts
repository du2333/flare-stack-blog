import { describe, expect, it } from "vitest";
import { CACHE_CONTROL } from "@/lib/constants";
import {
  applyWorkersCachePolicy,
  purgeOptionsFor,
  workersCacheKey,
  workersCachePolicy,
} from "./workers-cache-policy";

describe("workersCacheKey", () => {
  it("keeps only tagName on the posts list", () => {
    expect(
      workersCacheKey("https://blog.example/posts?tagName=rust&utm_source=x"),
    ).toBe("/posts?tagName=rust");
  });

  it("drops comment highlight query on a post page", () => {
    expect(workersCacheKey("https://blog.example/post/hello?comment=9")).toBe(
      "/post/hello",
    );
  });

  it("drops the search query", () => {
    expect(workersCacheKey("https://blog.example/search?q=kv")).toBe("/search");
  });
});

describe("workersCachePolicy", () => {
  it("tags home and post lists so a publish can clear them together", () => {
    expect(workersCachePolicy("/")).toEqual({
      cache: "public",
      tags: ["html", "posts"],
    });
    expect(workersCachePolicy("/posts")).toEqual({
      cache: "public",
      tags: ["html", "posts"],
    });
  });

  it("tags a post page with an ASCII-only slug tag", () => {
    expect(workersCachePolicy("/post/你好")).toEqual({
      cache: "public",
      tags: ["html", "posts", `post:${encodeURIComponent("你好")}`],
    });
  });

  it("tags friend links separately from posts", () => {
    expect(workersCachePolicy("/friend-links")).toEqual({
      cache: "public",
      tags: ["html", "friend-links"],
    });
  });

  it("tags feeds with html and posts", () => {
    expect(workersCachePolicy("/rss.xml")).toEqual({
      cache: "public",
      tags: ["html", "posts"],
    });
    expect(workersCachePolicy("/robots.txt")).toEqual({
      cache: "public",
      tags: ["html"],
    });
  });

  it("allows images to cache without content tags", () => {
    expect(workersCachePolicy("/images/cover.webp")).toEqual({
      cache: "public",
      tags: [],
    });
  });

  it("keeps APIs, admin, and unsubscribe out of the public cache", () => {
    expect(workersCachePolicy("/api/posts")).toEqual({ cache: "private" });
    expect(workersCachePolicy("/admin/posts")).toEqual({ cache: "private" });
    expect(workersCachePolicy("/unsubscribe")).toEqual({ cache: "private" });
    expect(workersCachePolicy("/login")).toEqual({ cache: "private" });
    expect(workersCachePolicy("/profile")).toEqual({ cache: "private" });
  });
});

describe("purgeOptionsFor", () => {
  it("purges list and the published post", () => {
    expect(purgeOptionsFor("post.published", { slug: "hello" })).toEqual({
      tags: ["posts", "post:hello"],
    });
  });

  it("purges post lists when popularity changes", () => {
    expect(purgeOptionsFor("post-popularity.updated", {})).toEqual({
      tags: ["posts"],
    });
  });

  it("purges encoded slug tags", () => {
    expect(purgeOptionsFor("post.deleted", { slug: "你好" })).toEqual({
      tags: ["posts", `post:${encodeURIComponent("你好")}`],
    });
  });

  it("purges posts when tags change", () => {
    expect(purgeOptionsFor("tag.changed", { slugs: ["a", "b"] })).toEqual({
      tags: ["posts", "post:a", "post:b"],
    });
  });

  it("purges html on site config change", () => {
    expect(purgeOptionsFor("site-config.changed", {})).toEqual({
      tags: ["html"],
    });
  });

  it("purges everything for a full reset", () => {
    expect(purgeOptionsFor("all", {})).toEqual({ purgeEverything: true });
  });
});

describe("applyWorkersCachePolicy", () => {
  it("forces private cache headers on API responses", () => {
    const response = applyWorkersCachePolicy(
      new Request("https://blog.example/api/posts"),
      new Response("{}", { headers: { "Content-Type": "application/json" } }),
    );
    expect(response.headers.get("Cache-Control")).toBe(
      CACHE_CONTROL.private["Cache-Control"],
    );
    expect(response.headers.get("CDN-Cache-Control")).toBe(
      CACHE_CONTROL.private["CDN-Cache-Control"],
    );
    expect(response.headers.get("Cache-Tag")).toBeNull();
  });

  it("adds Cache-Tag on public HTML without changing Cache-Control", () => {
    const response = applyWorkersCachePolicy(
      new Request("https://blog.example/post/hello"),
      new Response("<html></html>", {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": CACHE_CONTROL.public["Cache-Control"],
        },
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe(
      CACHE_CONTROL.public["Cache-Control"],
    );
    expect(response.headers.get("Cache-Tag")).toBe("html,posts,post:hello");
  });
});
