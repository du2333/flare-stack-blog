import { describe, expect, it } from "vitest";
import { CACHE_CONTROL } from "@/lib/constants";
import {
  applyWorkersCachePolicy,
  mediaPurgeTarget,
  purgeOptionsFor,
  workersCacheKey,
  workersCachePolicy,
} from "./workers-cache-policy";

describe("workersCacheKey", () => {
  it("separates homepage pages while ignoring tracking parameters", () => {
    expect(workersCacheKey("https://blog.example/?page=2&utm_source=x")).toBe(
      "/?page=2",
    );
    expect(workersCacheKey("https://blog.example/?page=3")).toBe("/?page=3");
    expect(workersCacheKey("https://blog.example/?page=1")).toBe("/");
    expect(workersCacheKey("https://blog.example/?page=%222%22")).not.toBe("/");
  });

  it("separates Moments list pages", () => {
    expect(workersCacheKey("https://blog.example/moments?page=2&x=1")).toBe(
      "/moments?page=2",
    );
    expect(workersCacheKey("https://blog.example/moments?page=1")).toBe(
      "/moments",
    );
    expect(workersCacheKey("https://blog.example/moments/3?page=2")).toBe(
      "/moments/3",
    );
  });

  it("keeps only tagName on the posts list", () => {
    expect(
      workersCacheKey("https://blog.example/posts?tagName=rust&utm_source=x"),
    ).toBe("/posts?tagName=rust");
  });

  it("keeps category and uncategorized filters on the posts list", () => {
    expect(
      workersCacheKey(
        "https://blog.example/posts?categoryName=tech&tagName=rust&foo=1",
      ),
    ).toBe("/posts?tagName=rust&categoryName=tech");
    expect(
      workersCacheKey("https://blog.example/posts?uncategorized=true&x=1"),
    ).toBe("/posts?uncategorized=true");
  });

  it("drops comment highlight query on a post page", () => {
    expect(workersCacheKey("https://blog.example/post/hello?comment=9")).toBe(
      "/post/hello",
    );
  });

  it("drops the search query", () => {
    expect(workersCacheKey("https://blog.example/search?q=kv")).toBe("/search");
  });

  it("keeps image transform query so variants do not share a cache entry", () => {
    expect(
      workersCacheKey(
        "https://blog.example/images/cover.png?quality=80&width=800&utm=1",
      ),
    ).toBe("/images/cover.png?quality=80&width=800");
    expect(workersCacheKey("https://blog.example/images/cover.png")).toBe(
      "/images/cover.png",
    );
    expect(
      workersCacheKey("https://blog.example/images/loop.gif?original=true"),
    ).toBe("/images/loop.gif?original=true");
  });
});

describe("workersCachePolicy", () => {
  it("tags home and post lists so a publish can clear them together", () => {
    expect(workersCachePolicy("/")).toEqual({
      cache: "public",
      tags: ["html", "posts", "popularity", "moments"],
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

  it("tags the Moments list and each Moment's page apart from posts", () => {
    expect(workersCachePolicy("/moments")).toEqual({
      cache: "public",
      tags: ["html", "moments"],
    });
    expect(workersCachePolicy("/moments/12")).toEqual({
      cache: "public",
      tags: ["html", "moment:12"],
    });
    expect(workersCachePolicy("/moments/latest")).toEqual({
      cache: "public",
      tags: ["html", "moments"],
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

  it("tags the Moments feeds and the sitemap with moments", () => {
    for (const path of [
      "/moments/rss.xml",
      "/moments/atom.xml",
      "/moments/feed.json",
    ]) {
      expect(workersCachePolicy(path)).toEqual({
        cache: "public",
        tags: ["html", "moments"],
      });
    }
    expect(workersCachePolicy("/sitemap.xml")).toEqual({
      cache: "public",
      tags: ["html", "posts", "moments"],
    });
  });

  it("tags images by their Media key only", () => {
    expect(workersCachePolicy("/images/cover.webp")).toEqual({
      cache: "public",
      tags: ["media:cover.webp"],
    });
    expect(workersCachePolicy("/images/asset/themes/bg.webp")).toEqual({
      cache: "public",
      tags: ["media:asset%2Fthemes%2Fbg.webp"],
    });
  });

  it("purges every cached copy of a replaced Media key", () => {
    const target = mediaPurgeTarget("cover.webp") as { tags: string[] };
    const policy = workersCachePolicy("/images/cover.webp");
    if (policy.cache !== "public") throw new Error("images must be public");
    expect(target.tags).toEqual(policy.tags);
    for (const path of ["/", "/post/hello", "/images/other.webp"]) {
      const other = workersCachePolicy(path);
      if (other.cache !== "public") continue;
      expect(
        target.tags.some((tag) => other.tags.includes(tag)),
        path,
      ).toBe(false);
    }
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

  it("purges only the popularity tag when popularity changes", () => {
    expect(purgeOptionsFor("post-popularity.updated", {})).toEqual({
      tags: ["popularity"],
    });
  });

  it("reaches only the home pages through the popularity tag", () => {
    const [tag] = (
      purgeOptionsFor("post-popularity.updated", {}) as { tags: string[] }
    ).tags;
    const paths = [
      "/",
      "/posts",
      "/post/hello",
      "/friend-links",
      "/search",
      "/rss.xml",
      "/atom.xml",
      "/feed.json",
      "/sitemap.xml",
      "/robots.txt",
      "/site.webmanifest",
      "/images/cover.webp",
    ];
    const purged = paths.filter((path) => {
      const policy = workersCachePolicy(path);
      return policy.cache === "public" && policy.tags.includes(tag!);
    });
    expect(purged).toEqual(["/"]);
  });

  it("still reaches the home pages for every content change", () => {
    const home = workersCachePolicy("/");
    if (home.cache !== "public") throw new Error("home must be public");
    const reasons = [
      ["post.published", { slug: "a" }],
      ["post.deleted", { slug: "a" }],
      ["tag.changed", {}],
      ["tag.changed", { slugs: ["a"] }],
      ["category.changed", {}],
      ["category.changed", { slugs: ["a"] }],
      ["site-config.changed", {}],
    ] satisfies Array<Parameters<typeof purgeOptionsFor>>;
    for (const [reason, params] of reasons) {
      const target = purgeOptionsFor(reason, params) as { tags: string[] };
      expect(
        target.tags.some((tag) => home.tags.includes(tag)),
        reason,
      ).toBe(true);
    }
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

  it("purges posts when categories change", () => {
    expect(purgeOptionsFor("category.changed", { slugs: ["a", "b"] })).toEqual({
      tags: ["posts", "post:a", "post:b"],
    });
  });

  it("purges html on site config change", () => {
    expect(purgeOptionsFor("site-config.changed", {})).toEqual({
      tags: ["html"],
    });
  });

  it("purges the Moments lists, the home page and the Moment's page on a Moment change", () => {
    const target = purgeOptionsFor("moment.changed", {
      momentId: 7,
      navigationChanged: false,
    }) as { tags: string[] };
    expect(target).toEqual({ tags: ["moments", "moment:7"] });
    const paths = [
      "/",
      "/moments",
      "/moments/7",
      "/moments/8",
      "/moments/rss.xml",
      "/moments/atom.xml",
      "/moments/feed.json",
      "/sitemap.xml",
      "/posts",
      "/post/hello",
      "/friend-links",
      "/rss.xml",
    ];
    const purged = paths.filter((path) => {
      const policy = workersCachePolicy(path);
      return (
        policy.cache === "public" &&
        policy.tags.some((tag) => target.tags.includes(tag))
      );
    });
    expect(purged).toEqual([
      "/",
      "/moments",
      "/moments/7",
      "/moments/rss.xml",
      "/moments/atom.xml",
      "/moments/feed.json",
      "/sitemap.xml",
    ]);
  });

  it("purges every page with the public navigation when Moments appear or disappear", () => {
    expect(
      purgeOptionsFor("moment.changed", {
        momentId: 7,
        navigationChanged: true,
      }),
    ).toEqual({ tags: ["html"] });
    for (const path of [
      "/",
      "/moments",
      "/moments/7",
      "/posts",
      "/post/hello",
      "/friend-links",
      "/search",
    ]) {
      const policy = workersCachePolicy(path);
      if (policy.cache !== "public") throw new Error(`${path} must be public`);
      expect(policy.tags, path).toContain("html");
    }
  });

  it("purges everything for a full reset", () => {
    expect(purgeOptionsFor("all", {})).toEqual({ purgeEverything: true });
  });
});

describe("CACHE_CONTROL", () => {
  it("keeps public HTML fresh at the edge for a day and stale for a week", () => {
    expect(CACHE_CONTROL.html["CDN-Cache-Control"]).toBe(
      "public, max-age=86400, stale-while-revalidate=604800",
    );
  });

  it("leaves the browser always revalidating public HTML", () => {
    expect(CACHE_CONTROL.html["Cache-Control"]).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  it("keeps media on the one-hour edge lifetime", () => {
    expect(CACHE_CONTROL.public["CDN-Cache-Control"]).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
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

  it("tags the home page with popularity", () => {
    const response = applyWorkersCachePolicy(
      new Request("https://blog.example/?page=2"),
      new Response("<html></html>"),
    );
    expect(response.headers.get("Cache-Tag")).toBe(
      "html,posts,popularity,moments",
    );
  });
});
