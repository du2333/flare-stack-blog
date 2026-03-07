import { describe, expect, it } from "vitest";
import {
  buildArticleJsonLd,
  buildCanonicalHref,
  buildCanonicalUrl,
  canonicalLink,
} from "@/lib/seo";

describe("seo helpers", () => {
  it("should normalize trailing slashes for canonical paths", () => {
    expect(buildCanonicalHref("/posts/")).toBe("/posts");
    expect(buildCanonicalHref("/")).toBe("/");
  });

  it("should include only defined query params", () => {
    expect(
      buildCanonicalHref("/posts/", {
        tagName: "TypeScript",
        empty: undefined,
      }),
    ).toBe("/posts?tagName=TypeScript");
  });

  it("should build canonical link descriptors", () => {
    expect(canonicalLink("https://example.com/post/example-article")).toEqual({
      rel: "canonical",
      href: "https://example.com/post/example-article",
    });
  });

  it("should build absolute canonical urls from domain", () => {
    expect(buildCanonicalUrl("example.com", "/posts/")).toBe(
      "https://example.com/posts",
    );
    expect(
      buildCanonicalUrl("example.com", "/posts/", {
        tagName: "guides",
      }),
    ).toBe("https://example.com/posts?tagName=guides");
  });

  it("should build article json-ld with article metadata", () => {
    const jsonLd = JSON.parse(
      buildArticleJsonLd({
        authorName: "Example Author",
        canonicalHref: "https://example.com/post/example-article",
        post: {
          slug: "example-article",
          summary: "A concise article summary",
          title: "Example Article",
          publishedAt: "2026-03-01T12:00:00.000Z",
          updatedAt: "2026-03-02T12:00:00.000Z",
          tags: [{ name: "Guides" }, { name: "SEO" }],
        },
      }),
    );

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "Article",
      author: {
        "@type": "Person",
        name: "Example Author",
      },
      dateModified: "2026-03-02T12:00:00.000Z",
      datePublished: "2026-03-01T12:00:00.000Z",
      description: "A concise article summary",
      headline: "Example Article",
      keywords: ["Guides", "SEO"],
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://example.com/post/example-article",
      },
      url: "https://example.com/post/example-article",
    });
  });
});
