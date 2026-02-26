import { describe, expect, it } from "vitest";
import type { PostFrontmatter } from "@/features/import-export/import-export.schema";
import {
  normalizeFrontmatter,
  parseFrontmatter,
  stringifyFrontmatter,
} from "@/features/import-export/utils/frontmatter";

describe("parseFrontmatter", () => {
  it("should parse YAML frontmatter and content", () => {
    const raw = "---\ntitle: Hello\nstatus: published\n---\nBody text";
    const { data, content } = parseFrontmatter(raw);

    expect(data.title).toBe("Hello");
    expect(content.trim()).toBe("Body text");
  });

  it("should return empty data for content without frontmatter", () => {
    const raw = "# Just markdown\n\nNo frontmatter here.";
    const { data, content } = parseFrontmatter(raw);

    expect(Object.keys(data)).toHaveLength(0);
    expect(content.trim()).toBe(raw);
  });

  it("should handle empty string", () => {
    const { data, content } = parseFrontmatter("");

    expect(Object.keys(data)).toHaveLength(0);
    expect(content).toBe("");
  });

  it("should parse complex YAML with arrays and dates", () => {
    const raw =
      "---\ntags:\n  - JavaScript\n  - 前端\ndate: 2024-01-15\n---\ncontent";
    const { data } = parseFrontmatter(raw);

    expect(data.tags).toEqual(["JavaScript", "前端"]);
    expect(data.date).toBeDefined();
  });

  it("should handle frontmatter with no content body", () => {
    const raw = "---\ntitle: Only Meta\n---\n";
    const { data, content } = parseFrontmatter(raw);

    expect(data.title).toBe("Only Meta");
    expect(content.trim()).toBe("");
  });
});

describe("normalizeFrontmatter", () => {
  // Helper: minimal valid input (title is required by schema)
  const base = { title: "Test Post" };

  it("should extract title", () => {
    const result = normalizeFrontmatter({ title: "My Post" });
    expect(result).not.toBeNull();
    expect(result!.title).toBe("My Post");
  });

  it("should succeed with empty title when title is missing", () => {
    const result = normalizeFrontmatter({ slug: "no-title" });
    expect(result).not.toBeNull();
    expect(result!.title).toBe("");
  });

  it("should succeed with empty title when there is no frontmatter at all", () => {
    const result = normalizeFrontmatter({});
    expect(result).not.toBeNull();
    expect(result!.title).toBe("");
    expect(result!.status).toBe("published");
    expect(result!.tags).toEqual([]);
  });

  it("should extract slug from slug field", () => {
    const result = normalizeFrontmatter({ ...base, slug: "my-post" });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("my-post");
  });

  it("should extract slug from url field (Hugo)", () => {
    const result = normalizeFrontmatter({ ...base, url: "/posts/my-post/" });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("my-post");
  });

  it("should extract slug from permalink field", () => {
    const result = normalizeFrontmatter({
      ...base,
      permalink: "/blog/my-post",
    });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("my-post");
  });

  it("should prefer slug over url/permalink", () => {
    const result = normalizeFrontmatter({
      ...base,
      slug: "from-slug",
      url: "/from-url",
      permalink: "/from-permalink",
    });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("from-slug");
  });

  it("should extract summary from description (Hexo)", () => {
    const result = normalizeFrontmatter({ ...base, description: "A summary" });
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("A summary");
  });

  it("should extract summary from excerpt (Jekyll)", () => {
    const result = normalizeFrontmatter({ ...base, excerpt: "An excerpt" });
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("An excerpt");
  });

  it("should set status to draft when draft=true (Hugo)", () => {
    const result = normalizeFrontmatter({ ...base, draft: true });
    expect(result).not.toBeNull();
    expect(result!.status).toBe("draft");
  });

  it("should set status to published by default", () => {
    const result = normalizeFrontmatter(base);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("published");
  });

  it("should prefer draft field over status field", () => {
    const result = normalizeFrontmatter({
      ...base,
      draft: true,
      status: "published",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe("draft");
  });

  it("should parse publishedAt from date field", () => {
    const result = normalizeFrontmatter({ ...base, date: "2024-01-15" });
    expect(result).not.toBeNull();
    expect(result!.publishedAt).toBeDefined();
    expect(new Date(result!.publishedAt!).getFullYear()).toBe(2024);
  });

  it("should parse publishedAt from Date object", () => {
    const result = normalizeFrontmatter({
      ...base,
      date: new Date("2024-01-15"),
    });
    expect(result).not.toBeNull();
    expect(result!.publishedAt).toBeDefined();
  });

  it("should parse updatedAt from lastmod (Hugo)", () => {
    const result = normalizeFrontmatter({ ...base, lastmod: "2024-02-01" });
    expect(result).not.toBeNull();
    expect(result!.updatedAt).toBeDefined();
  });

  it("should parse updatedAt from modified field", () => {
    const result = normalizeFrontmatter({ ...base, modified: "2024-02-01" });
    expect(result).not.toBeNull();
    expect(result!.updatedAt).toBeDefined();
  });

  it("should extract tags array", () => {
    const result = normalizeFrontmatter({ ...base, tags: ["a", "b"] });
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["a", "b"]);
  });

  it("should extract tags from categories (Hexo)", () => {
    const result = normalizeFrontmatter({ ...base, categories: ["x", "y"] });
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["x", "y"]);
  });

  it("should filter non-string items from tags", () => {
    const result = normalizeFrontmatter({
      ...base,
      tags: ["valid", 123, null, "ok"],
    });
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["valid", "ok"]);
  });

  it("should ignore invalid date strings", () => {
    const result = normalizeFrontmatter({ ...base, date: "not-a-date" });
    expect(result).not.toBeNull();
    expect(result!.publishedAt).toBeUndefined();
  });

  it("should extract readTimeInMinutes", () => {
    const result = normalizeFrontmatter({ ...base, readTimeInMinutes: 5 });
    expect(result).not.toBeNull();
    expect(result!.readTimeInMinutes).toBe(5);
  });

  it("should apply defaults from schema", () => {
    const result = normalizeFrontmatter(base);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("published");
    expect(result!.readTimeInMinutes).toBe(1);
    expect(result!.tags).toEqual([]);
  });
});

describe("stringifyFrontmatter", () => {
  it("should produce valid frontmatter + content", () => {
    const fm: PostFrontmatter = {
      title: "Test",
      slug: "test",
      status: "published",
      readTimeInMinutes: 1,
      tags: [],
    };
    const result = stringifyFrontmatter(fm, "Hello world");

    expect(result).toContain("---");
    expect(result).toContain("title: Test");
    expect(result).toContain("Hello world");
  });

  it("should round-trip with parseFrontmatter", () => {
    const fm: PostFrontmatter = {
      title: "Round Trip",
      slug: "round-trip",
      status: "draft",
      createdAt: "2024-06-15T00:00:00.000Z",
      updatedAt: "2024-06-15T00:00:00.000Z",
      readTimeInMinutes: 3,
      tags: ["test"],
    };
    const content = "Some content here.";
    const serialized = stringifyFrontmatter(fm, content);
    const { data, content: parsedContent } = parseFrontmatter(serialized);

    expect(data.title).toBe("Round Trip");
    expect(data.slug).toBe("round-trip");
    expect(data.status).toBe("draft");
    expect(parsedContent.trim()).toBe(content);
  });
});
