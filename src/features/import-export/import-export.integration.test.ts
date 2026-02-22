import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import type { JSONContent } from "@tiptap/react";
import type { PostFrontmatter } from "@/features/import-export/import-export.schema";
import { EXPORT_MANIFEST_VERSION } from "@/features/import-export/import-export.schema";
import {
  enumerateMarkdownPosts,
  enumerateNativePosts,
  importSinglePost,
} from "@/features/import-export/workflows/import-helpers";
import { stringifyFrontmatter } from "@/features/import-export/utils/frontmatter";
import {
  jsonContentToMarkdown,
  makeExportImageRewriter,
} from "@/features/import-export/utils/markdown-serializer";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as TagRepo from "@/features/tags/data/tags.data";
import { getDb } from "@/lib/db";
import { PostTagsTable } from "@/lib/db/schema";

// --- Helpers ---

const encoder = new TextEncoder();

function toBytes(text: string): Uint8Array {
  return encoder.encode(text);
}

function buildManifest(postCount: number): string {
  return JSON.stringify({
    version: EXPORT_MANIFEST_VERSION,
    exportedAt: new Date().toISOString(),
    postCount,
    generator: "blog-cms",
  });
}

/**
 * 构建 native 格式的 zipFiles（in-memory）
 */
function buildNativeZipFiles(
  posts: Array<{
    slug: string;
    frontmatter: PostFrontmatter;
    markdown: string;
    contentJson?: JSONContent;
  }>,
): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};

  for (const post of posts) {
    const prefix = `posts/${post.slug}`;
    files[`${prefix}/index.md`] = toBytes(
      stringifyFrontmatter(post.frontmatter, post.markdown),
    );
    if (post.contentJson) {
      files[`${prefix}/content.json`] = toBytes(
        JSON.stringify(post.contentJson, null, 2),
      );
    }
  }

  files["manifest.json"] = toBytes(buildManifest(posts.length));
  return files;
}

/**
 * 构建 markdown 格式的 zipFiles（in-memory）
 */
function buildMarkdownZipFiles(
  posts: Array<{
    fileName: string;
    frontmatter: PostFrontmatter;
    markdown: string;
  }>,
): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};

  for (const post of posts) {
    files[post.fileName] = toBytes(
      stringifyFrontmatter(post.frontmatter, post.markdown),
    );
  }

  return files;
}

const SAMPLE_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello World" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Section" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Some content here." }],
    },
  ],
};

// --- Tests ---

describe("Import/Export Integration", () => {
  let db: ReturnType<typeof getDb>;

  beforeEach(() => {
    db = getDb(env);
  });

  describe("Native mode import", () => {
    it("should enumerate and import a native post with tags", async () => {
      const frontmatter: PostFrontmatter = {
        title: "测试文章",
        slug: "test-article",
        summary: "这是摘要",
        status: "published",
        publishedAt: "2024-06-15T00:00:00.000Z",
        readTimeInMinutes: 3,
        tags: ["TypeScript", "测试"],
      };

      const zipFiles = buildNativeZipFiles([
        {
          slug: "test-article",
          frontmatter,
          markdown: "Hello World\n\n## Section\n\nSome content here.",
          contentJson: SAMPLE_CONTENT,
        },
      ]);

      // Enumerate
      const entries = enumerateNativePosts(zipFiles);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe("测试文章");
      expect(entries[0].prefix).toBe("posts/test-article");

      // Import
      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );
      expect(result.skipped).toBeUndefined();
      expect(result.title).toBe("测试文章");
      expect(result.slug).toBe("test-article");

      // Verify DB: post
      const post = await PostRepo.findPostBySlug(db, "test-article");
      expect(post).not.toBeNull();
      expect(post!.title).toBe("测试文章");
      expect(post!.summary).toBe("这是摘要");
      expect(post!.status).toBe("published");
      expect(post!.readTimeInMinutes).toBe(3);
      expect(post!.contentJson).toEqual(SAMPLE_CONTENT);

      // Verify DB: tags
      expect(post!.tags).toHaveLength(2);
      const tagNames = post!.tags.map((t) => t.name).sort();
      expect(tagNames).toEqual(["TypeScript", "测试"]);
    });

    it("should import a post without content.json (markdown fallback)", async () => {
      const frontmatter: PostFrontmatter = {
        title: "Markdown Only",
        slug: "md-only",
        status: "published",
        readTimeInMinutes: 1,
        tags: [],
      };

      const zipFiles: Record<string, Uint8Array> = {
        "posts/md-only/index.md": toBytes(
          stringifyFrontmatter(frontmatter, "# Hello\n\nParagraph text."),
        ),
        "manifest.json": toBytes(buildManifest(1)),
      };

      const entries = enumerateNativePosts(zipFiles);
      expect(entries).toHaveLength(1);

      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );
      expect(result.skipped).toBeUndefined();

      const post = await PostRepo.findPostBySlug(db, "md-only");
      expect(post).not.toBeNull();
      expect(post!.contentJson).not.toBeNull();
    });
  });

  describe("Markdown mode import", () => {
    it("should enumerate and import a markdown post", async () => {
      const frontmatter: PostFrontmatter = {
        title: "Markdown 文章",
        slug: "markdown-post",
        summary: "从 Markdown 导入",
        status: "published",
        publishedAt: "2024-03-01T00:00:00.000Z",
        readTimeInMinutes: 2,
        tags: ["Markdown"],
      };

      const zipFiles = buildMarkdownZipFiles([
        {
          fileName: "markdown-post.md",
          frontmatter,
          markdown: "# Heading\n\nBody paragraph.",
        },
      ]);

      const entries = enumerateMarkdownPosts(zipFiles);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe("Markdown 文章");

      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "markdown",
      );
      expect(result.skipped).toBeUndefined();
      expect(result.title).toBe("Markdown 文章");

      const post = await PostRepo.findPostBySlug(db, "markdown-post");
      expect(post).not.toBeNull();
      expect(post!.summary).toBe("从 Markdown 导入");
      expect(post!.contentJson).not.toBeNull();

      expect(post!.tags).toHaveLength(1);
      expect(post!.tags[0].name).toBe("Markdown");
    });
  });

  describe("Slug collision", () => {
    it("should skip import when slug already exists", async () => {
      // Seed a post with the same slug
      await PostRepo.insertPost(db, {
        title: "Existing Post",
        slug: "existing-post",
        status: "published",
      });

      const zipFiles = buildNativeZipFiles([
        {
          slug: "existing-post",
          frontmatter: {
            title: "Duplicate",
            slug: "existing-post",
            status: "published",
            readTimeInMinutes: 1,
            tags: [],
          },
          markdown: "Content",
          contentJson: SAMPLE_CONTENT,
        },
      ]);

      const entries = enumerateNativePosts(zipFiles);
      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );

      expect(result.skipped).toBe(true);
    });
  });

  describe("Duplicate tags dedup", () => {
    it("should handle duplicate tags in frontmatter without PK violation", async () => {
      const zipFiles = buildNativeZipFiles([
        {
          slug: "dedup-tags",
          frontmatter: {
            title: "Dedup Tags",
            slug: "dedup-tags",
            status: "published",
            readTimeInMinutes: 1,
            tags: ["rust", "go", "rust"],
          },
          markdown: "Content",
          contentJson: SAMPLE_CONTENT,
        },
      ]);

      const entries = enumerateNativePosts(zipFiles);
      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );
      expect(result.skipped).toBeUndefined();

      const post = await PostRepo.findPostBySlug(db, "dedup-tags");
      expect(post).not.toBeNull();
      expect(post!.tags).toHaveLength(2);

      const tagNames = post!.tags.map((t) => t.name).sort();
      expect(tagNames).toEqual(["go", "rust"]);
    });
  });

  describe("Shared tags across posts", () => {
    it("should reuse existing tags when importing multiple posts", async () => {
      const zipFiles = buildNativeZipFiles([
        {
          slug: "post-a",
          frontmatter: {
            title: "Post A",
            slug: "post-a",
            status: "published",
            readTimeInMinutes: 1,
            tags: ["shared-tag", "tag-a"],
          },
          markdown: "Content A",
          contentJson: SAMPLE_CONTENT,
        },
        {
          slug: "post-b",
          frontmatter: {
            title: "Post B",
            slug: "post-b",
            status: "published",
            readTimeInMinutes: 1,
            tags: ["shared-tag", "tag-b"],
          },
          markdown: "Content B",
          contentJson: SAMPLE_CONTENT,
        },
      ]);

      const entries = enumerateNativePosts(zipFiles);
      expect(entries).toHaveLength(2);

      // Import both
      for (const entry of entries) {
        await importSinglePost(env, zipFiles, entry, "native");
      }

      // Verify shared-tag is only created once
      const allTags = await TagRepo.getAllTags(db);
      const sharedTags = allTags.filter((t) => t.name === "shared-tag");
      expect(sharedTags).toHaveLength(1);

      // Verify each post has correct tags
      const postA = await PostRepo.findPostBySlug(db, "post-a");
      const postB = await PostRepo.findPostBySlug(db, "post-b");

      expect(postA!.tags.map((t) => t.name).sort()).toEqual([
        "shared-tag",
        "tag-a",
      ]);
      expect(postB!.tags.map((t) => t.name).sort()).toEqual([
        "shared-tag",
        "tag-b",
      ]);
    });
  });

  describe("Draft post import", () => {
    it("should import draft post with null publishedAt", async () => {
      const zipFiles = buildNativeZipFiles([
        {
          slug: "draft-post",
          frontmatter: {
            title: "Draft Post",
            slug: "draft-post",
            status: "draft",
            readTimeInMinutes: 1,
            tags: [],
          },
          markdown: "Draft content",
          contentJson: SAMPLE_CONTENT,
        },
      ]);

      const entries = enumerateNativePosts(zipFiles);
      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );
      expect(result.skipped).toBeUndefined();

      const post = await PostRepo.findPostBySlug(db, "draft-post");
      expect(post).not.toBeNull();
      expect(post!.status).toBe("draft");
      expect(post!.publishedAt).toBeNull();
    });
  });

  describe("Export → Import round-trip", () => {
    it("should preserve post data through export and re-import", async () => {
      // 1. Seed DB with a post + tags
      const tag1 = await TagRepo.insertTag(db, { name: "轮回标签A" });
      const tag2 = await TagRepo.insertTag(db, { name: "轮回标签B" });

      const originalPost = await PostRepo.insertPost(db, {
        title: "原始文章",
        slug: "original-article",
        summary: "原始摘要",
        status: "published",
        contentJson: SAMPLE_CONTENT,
        readTimeInMinutes: 5,
        publishedAt: new Date("2024-06-15T00:00:00.000Z"),
      });

      await db.insert(PostTagsTable).values([
        { postId: originalPost.id, tagId: tag1.id },
        { postId: originalPost.id, tagId: tag2.id },
      ]);

      // 2. Fetch full post (like export workflow does)
      const fullPosts = await PostRepo.findFullPosts(db, {
        ids: [originalPost.id],
      });
      expect(fullPosts).toHaveLength(1);
      const fullPost = fullPosts[0];

      // 3. Build export ZIP structure in-memory
      const frontmatter: PostFrontmatter = {
        title: fullPost.title,
        slug: "reimported-article", // Different slug to avoid collision
        summary: fullPost.summary ?? undefined,
        status: fullPost.status,
        publishedAt: fullPost.publishedAt?.toISOString(),
        createdAt: fullPost.createdAt.toISOString(),
        updatedAt: fullPost.updatedAt.toISOString(),
        readTimeInMinutes: fullPost.readTimeInMinutes,
        tags: fullPost.tags.map((t) => t.name),
      };

      const rewriter = makeExportImageRewriter();
      const markdown = fullPost.contentJson
        ? jsonContentToMarkdown(fullPost.contentJson, {
            rewriteImageSrc: rewriter,
          })
        : "";

      const zipFiles = buildNativeZipFiles([
        {
          slug: "reimported-article",
          frontmatter,
          markdown,
          contentJson: fullPost.contentJson as JSONContent,
        },
      ]);

      // 4. Import
      const entries = enumerateNativePosts(zipFiles);
      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "native",
      );
      expect(result.skipped).toBeUndefined();
      expect(result.title).toBe("原始文章");

      // 5. Verify round-trip fidelity
      const reimported = await PostRepo.findPostBySlug(
        db,
        "reimported-article",
      );
      expect(reimported).not.toBeNull();
      expect(reimported!.title).toBe(fullPost.title);
      expect(reimported!.summary).toBe(fullPost.summary);
      expect(reimported!.status).toBe(fullPost.status);
      expect(reimported!.readTimeInMinutes).toBe(fullPost.readTimeInMinutes);
      expect(reimported!.contentJson).toEqual(fullPost.contentJson);

      // Tags should match
      const reimportedTagNames = reimported!.tags.map((t) => t.name).sort();
      const originalTagNames = fullPost.tags.map((t) => t.name).sort();
      expect(reimportedTagNames).toEqual(originalTagNames);
    });
  });

  describe("Hugo/Hexo frontmatter compatibility", () => {
    it("should import Hugo-style frontmatter (url, lastmod, categories)", async () => {
      const hugoMd = [
        "---",
        "title: Hugo Post",
        "url: /posts/hugo-style/",
        "description: Hugo summary",
        "lastmod: 2024-07-01T00:00:00Z",
        "draft: false",
        "categories:",
        "  - DevOps",
        "  - Cloud",
        "---",
        "",
        "Hugo content here.",
      ].join("\n");

      const zipFiles: Record<string, Uint8Array> = {
        "hugo-post.md": toBytes(hugoMd),
      };

      const entries = enumerateMarkdownPosts(zipFiles);
      expect(entries).toHaveLength(1);

      const result = await importSinglePost(
        env,
        zipFiles,
        entries[0],
        "markdown",
      );
      expect(result.skipped).toBeUndefined();

      const post = await PostRepo.findPostBySlug(db, "hugo-style");
      expect(post).not.toBeNull();
      expect(post!.title).toBe("Hugo Post");
      expect(post!.summary).toBe("Hugo summary");
      expect(post!.status).toBe("published");

      const tagNames = post!.tags.map((t) => t.name).sort();
      expect(tagNames).toEqual(["Cloud", "DevOps"]);
    });
  });
});
