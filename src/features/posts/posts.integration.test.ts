import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  createTestContext,
  drainTestExecutionContexts,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidate } from "@/features/cache/public-cache";
import { GetPostsCursorInputSchema } from "@/features/posts/schema/posts.schema";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import * as TagService from "@/features/tags/tags.service";
import { PostRevisionsTable, PostsTable } from "@/lib/db/schema";

import { unwrap } from "@/lib/errors";

describe("Posts Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);
  });

  const updatePost = async (
    input: Parameters<typeof PostService.updatePost>[1],
  ) => unwrap(await PostService.updatePost(adminContext, input));

  const createPublishedPost = async (title: string, slug: string) => {
    const { id } = await PostService.createEmptyPost(adminContext);
    await updatePost({
      id,
      data: {
        title,
        slug,
        publishedAt: new Date(),
      },
    });
    unwrap(await PostService.publishPost(adminContext, { id }));
    return id;
  };

  describe("Post CRUD", () => {
    it("should create an empty draft post", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      expect(id).toBeDefined();

      const post = await PostService.findPostById(adminContext, { id });
      expect(post).not.toBeNull();
      expect(post?.status).toBe("draft");
      expect(post?.title).toBe("");
    });

    it("should update a post with content", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);

      const updatedPost = await updatePost({
        id,
        data: {
          title: "Updated Title",
          slug: "updated-title",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Hello World" }],
              },
            ],
          },
          publishedAt: new Date(),
        },
      });

      expect(updatedPost).not.toBeNull();
      expect(updatedPost.title).toBe("Updated Title");
      expect(updatedPost.slug).toBe("updated-title");
      expect(updatedPost.status).toBe("draft");
    });

    it("should find a published post by slug", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Public Post",
          slug: "public-post",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      // 等待 waitUntil 完成（缓存写入）
      await waitForBackgroundTasks(adminContext.executionCtx);

      const post = await PostService.findPostBySlug(adminContext, {
        slug: "public-post",
      });

      expect(post).not.toBeNull();
      expect(post?.id).toBe(id);
      expect(post?.title).toBe("Public Post");
    });

    it("writes a public snapshot on publish", async () => {
      const publicContext = createTestContext();
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Legacy Snapshot",
          slug: "legacy-snapshot",
          publishedAt: new Date(),
          contentJson: {
            type: "doc",
            content: [
              {
                type: "codeBlock",
                attrs: { language: "ts" },
                content: [{ type: "text", text: "const answer = 42;" }],
              },
            ],
          },
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      const post = await PostService.findPostBySlug(publicContext, {
        slug: "legacy-snapshot",
      });
      expect(post).not.toBeNull();

      const storedPost = await adminContext.db.query.PostsTable.findFirst({
        where: eq(PostsTable.id, id),
      });
      expect(storedPost?.publicSnapshotJson).toBeTruthy();
      expect(storedPost?.publicSlug).toBe("legacy-snapshot");
    });

    it("should delete a post", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: { title: "To Delete", slug: "to-delete" },
      });

      await PostService.deletePost(adminContext, { id });

      const deletedPost = await PostService.findPostById(adminContext, { id });
      expect(deletedPost).toBeNull();
    });
  });

  describe("Slug Generation", () => {
    it("should generate a unique slug when there is a collision", async () => {
      const post1 = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: post1.id,
        data: { title: "Collision", slug: "collision" },
      });

      const { slug } = await PostService.generateSlug(adminContext, {
        title: "Collision",
      });

      expect(slug).toBe("collision-1");
    });

    it("should generate incrementing slugs for multiple collisions", async () => {
      const post1 = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: post1.id,
        data: { title: "Test", slug: "test" },
      });

      const post2 = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: post2.id,
        data: { title: "Test", slug: "test-1" },
      });

      const { slug } = await PostService.generateSlug(adminContext, {
        title: "Test",
      });

      expect(slug).toBe("test-2");
    });
  });

  describe("Cache Behavior", () => {
    it("should cache post by slug after first fetch", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Cached Post",
          slug: "cached-post",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      // First fetch - cache MISS
      const post1 = await PostService.findPostBySlug(adminContext, {
        slug: "cached-post",
      });
      expect(post1).not.toBeNull();

      await waitForBackgroundTasks(adminContext.executionCtx);

      const cachedData = await env.KV.get("v0:post:cached-post", "json");
      expect(cachedData).not.toBeNull();
    });

    it("should refetch after public cache invalidation", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Version Test",
          slug: "version-test",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      await PostService.findPostBySlug(adminContext, { slug: "version-test" });
      await waitForBackgroundTasks(adminContext.executionCtx);
      expect(await env.KV.get("v0:post:version-test", "json")).not.toBeNull();

      await invalidate.postPublished(adminContext, { slug: "version-test" });

      expect(await env.KV.get("v0:post:version-test", "json")).toBeNull();
    });

    it("should use isolated storage for each test", async () => {
      expect(await env.KV.get("v0:post:cached-post")).toBeNull();
    });
  });

  describe("Post Pagination (getPostsCursor)", () => {
    const seedAllTagPosts = async () => {
      const allTag = unwrap(
        await TagService.createTag(adminContext, { name: "all" }),
      );
      const { id: taggedPostId } =
        await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: taggedPostId,
        data: {
          title: "Tagged All Post",
          slug: "tagged-all-post",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: taggedPostId,
        tagIds: [allTag.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: taggedPostId }));
      await createPublishedPost("Untagged Post", "untagged-post");
    };

    it("should normalize an exact empty Tag filter to no filter", () => {
      const input = GetPostsCursorInputSchema.parse({ tagName: "" });

      expect(input.tagName).toBeUndefined();
    });

    it("should not let an empty Tag filter bypass the unfiltered cache", async () => {
      const initialPublicContext = createTestContext();
      const emptyList = await PostService.getPostsCursor(
        initialPublicContext,
        {},
      );
      expect(emptyList.items).toEqual([]);
      await waitForBackgroundTasks(initialPublicContext.executionCtx);

      await createPublishedPost("New Post", "new-post");
      await waitForBackgroundTasks(adminContext.executionCtx);

      const emptyTagList = await PostService.getPostsCursor(
        createTestContext(),
        { tagName: "" },
      );

      expect(emptyTagList.items.map((post) => post.slug)).toEqual(["new-post"]);
    });

    it("should keep a real Tag named all distinct from the unfiltered list", async () => {
      const publicContext = createTestContext();
      await seedAllTagPosts();

      const unfiltered = await PostService.getPostsCursor(publicContext, {});
      expect(unfiltered.items).toHaveLength(2);
      await waitForBackgroundTasks(publicContext.executionCtx);

      const filtered = await PostService.getPostsCursor(createTestContext(), {
        tagName: "all",
      });

      expect(filtered.items.map((post) => post.slug)).toEqual([
        "tagged-all-post",
      ]);
    });

    it("should keep the unfiltered list distinct after caching a real Tag named all", async () => {
      const publicContext = createTestContext();
      await seedAllTagPosts();

      const filtered = await PostService.getPostsCursor(publicContext, {
        tagName: "all",
      });
      expect(filtered.items.map((post) => post.slug)).toEqual([
        "tagged-all-post",
      ]);
      await waitForBackgroundTasks(publicContext.executionCtx);

      const unfiltered = await PostService.getPostsCursor(
        createTestContext(),
        {},
      );
      expect(unfiltered.items.map((post) => post.slug).sort()).toEqual([
        "tagged-all-post",
        "untagged-post",
      ]);
    });

    it("should read the current Post list from D1 when the generation cannot be read", async () => {
      const publicContext = createTestContext();
      await createPublishedPost("Fresh Post", "fresh-post");
      await publicContext.env.KV.put(
        "v0:posts:list:10:0:all",
        JSON.stringify({ items: [], nextCursor: null }),
      );
      vi.spyOn(publicContext.env.KV, "get").mockRejectedValueOnce(
        new Error("KV unavailable"),
      );

      const result = await PostService.getPostsCursor(publicContext, {});

      expect(result.items.map((post) => post.slug)).toEqual(["fresh-post"]);
    });

    it("should get posts with cursor pagination", async () => {
      const publicContext = createTestContext();
      const basePublishedAt = new Date("2026-01-01T12:00:00.000Z");

      // Create 5 published posts
      for (let i = 1; i <= 5; i++) {
        const { id } = await PostService.createEmptyPost(adminContext);
        await updatePost({
          id,
          data: {
            title: `Post ${i}`,
            slug: `post-${i}`,
            // PostsTable stores timestamps with second precision, so use
            // deterministic minute-level gaps to avoid flaky ordering.
            publishedAt: new Date(
              basePublishedAt.getTime() - (i - 1) * 60 * 1000,
            ),
          },
        });
        unwrap(await PostService.publishPost(adminContext, { id }));
      }

      // First page with limit 3
      const page1 = await PostService.getPostsCursor(publicContext, {
        limit: 3,
      });

      expect(page1.items).toHaveLength(3);
      expect(page1.nextCursor).not.toBeNull();
      expect(page1.items[0].title).toBe("Post 1"); // Most recent first

      // Second page using cursor
      const page2 = await PostService.getPostsCursor(publicContext, {
        limit: 3,
        cursor: page1.nextCursor!,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.nextCursor).toBeNull(); // No more pages
    });

    it("should filter posts by tag name", async () => {
      const publicContext = createTestContext();

      // Create a tag
      const tag = unwrap(
        await TagService.createTag(adminContext, {
          name: "TypeScript",
        }),
      );

      // Create 2 posts, only 1 with the tag
      const { id: post1Id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: post1Id,
        data: {
          title: "TypeScript Post",
          slug: "ts-post",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: post1Id,
        tagIds: [tag.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: post1Id }));

      const { id: post2Id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: post2Id,
        data: {
          title: "JavaScript Post",
          slug: "js-post",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id: post2Id }));

      // Filter by tag
      const result = await PostService.getPostsCursor(publicContext, {
        tagName: "TypeScript",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("TypeScript Post");
    });

    it("should show post whose publishedAt is today (UTC) even if stored time is later in the day", async () => {
      const publicContext = createTestContext();

      // Simulate the editor bug scenario: user selects "today" which stores as noon UTC
      // (new Date(`${dateStr}T12:00:00Z`)), but current UTC time may be before noon.
      // We use end-of-day to reliably ensure the stored time is "future" within today.
      const todayUTC = new Date().toISOString().slice(0, 10);
      const endOfTodayUTC = new Date(`${todayUTC}T23:59:59Z`);

      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Today Post",
          slug: "today-post",
          publishedAt: endOfTodayUTC,
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      const result = await PostService.getPostsCursor(publicContext, {});

      // Should be visible because the publishedAt DATE equals today,
      // even though the stored time (23:59:59Z) is technically in the future
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Today Post");
    });

    it("should return empty when no posts match tag", async () => {
      const publicContext = createTestContext();

      // Create a post without tags
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "No Tag Post",
          slug: "no-tag-post",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      const result = await PostService.getPostsCursor(publicContext, {
        tagName: "NonExistentTag",
      });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("should include tags in paginated results", async () => {
      const publicContext = createTestContext();

      // Create tags
      const tag1 = unwrap(
        await TagService.createTag(adminContext, { name: "React" }),
      );
      const tag2 = unwrap(
        await TagService.createTag(adminContext, { name: "Vue" }),
      );

      // Create post with multiple tags
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Frontend Post",
          slug: "frontend-post",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: id,
        tagIds: [tag1.id, tag2.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id }));

      const result = await PostService.getPostsCursor(publicContext, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tags).toHaveLength(2);
      expect(result.items[0].tags?.map((t) => t.name)).toContain("React");
      expect(result.items[0].tags?.map((t) => t.name)).toContain("Vue");
    });
  });

  describe("Admin Operations", () => {
    it("should get posts for admin with status filter", async () => {
      // Create draft and published posts
      const { id: draftId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: draftId,
        data: { title: "Draft Post", slug: "draft-post" },
      });

      const { id: pubId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: pubId,
        data: {
          title: "Published Post",
          slug: "pub-post",
          publishedAt: new Date(),
        },
      });
      unwrap(await PostService.publishPost(adminContext, { id: pubId }));

      // Filter by draft status
      const drafts = await PostService.getPosts(adminContext, {
        status: "draft",
      });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].title).toBe("Draft Post");

      // Filter by published status
      const published = await PostService.getPosts(adminContext, {
        status: "published",
      });
      expect(published).toHaveLength(1);
      expect(published[0].title).toBe("Published Post");
    });

    it("should search posts by title keyword", async () => {
      // Create posts with different titles
      const { id: id1 } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: id1,
        data: { title: "Learn TypeScript", slug: "learn-ts" },
      });

      const { id: id2 } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: id2,
        data: { title: "Learn JavaScript", slug: "learn-js" },
      });

      const { id: id3 } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: id3,
        data: { title: "Python Guide", slug: "python-guide" },
      });

      // Search for "Learn"
      const results = await PostService.getPosts(adminContext, {
        search: "Learn",
      });

      expect(results).toHaveLength(2);
      expect(results.map((p) => p.title)).toContain("Learn TypeScript");
      expect(results.map((p) => p.title)).toContain("Learn JavaScript");
    });

    it("should count posts with filters", async () => {
      // Create mixed posts
      for (let i = 0; i < 3; i++) {
        const { id } = await PostService.createEmptyPost(adminContext);
        await updatePost({
          id,
          data: {
            title: `Draft ${i}`,
            slug: `draft-${i}`,
          },
        });
      }

      for (let i = 0; i < 2; i++) {
        const { id } = await PostService.createEmptyPost(adminContext);
        await updatePost({
          id,
          data: {
            title: `Published ${i}`,
            slug: `published-${i}`,
            publishedAt: new Date(),
          },
        });
        unwrap(await PostService.publishPost(adminContext, { id }));
      }

      const draftCount = await PostService.getPostsCount(adminContext, {
        status: "draft",
      });
      expect(draftCount).toBe(3);

      const publishedCount = await PostService.getPostsCount(adminContext, {
        status: "published",
      });
      expect(publishedCount).toBe(2);

      const totalCount = await PostService.getPostsCount(adminContext, {});
      expect(totalCount).toBe(5);
    });

    it("should find post by slug for admin including drafts", async () => {
      // Create a draft post
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Secret Draft",
          slug: "secret-draft",
        },
      });

      // Admin should find it
      const adminResult = await PostService.findPostBySlugAdmin(adminContext, {
        slug: "secret-draft",
      });
      expect(adminResult).not.toBeNull();
      expect(adminResult?.title).toBe("Secret Draft");

      // Public API should NOT find it
      const publicContext = createTestContext();
      const publicResult = await PostService.findPostBySlug(publicContext, {
        slug: "secret-draft",
      });
      expect(publicResult).toBeNull();
    });
  });

  describe("Workflow Integration", () => {
    it("does not insert another publish revision when republishing unchanged content", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id,
        data: {
          title: "Idempotent Publish",
          slug: "idempotent-publish",
          publishedAt: new Date(),
        },
      });

      unwrap(await PostService.publishPost(adminContext, { id }));
      unwrap(await PostService.publishPost(adminContext, { id }));

      const revisions = await PostRevisionService.listPostRevisions(
        adminContext,
        { postId: id },
      );
      expect(
        revisions.filter((revision) => revision.reason === "publish"),
      ).toHaveLength(1);
    });

    it("should auto-set publishedAt when publishing for the first time", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);

      // Update to published WITHOUT setting publishedAt
      await updatePost({
        id,
        data: {
          title: "Auto Publish Date",
          slug: "auto-publish-date",
          // No publishedAt set
        },
      });

      // Trigger workflow - this should auto-set publishedAt
      unwrap(await PostService.publishPost(adminContext, { id }));

      // Verify publishedAt was set
      const post = await PostService.findPostById(adminContext, { id });
      expect(post?.publishedAt).not.toBeNull();
    });
  });

  describe("Related Posts", () => {
    it("should return related posts ranked by tag match count", async () => {
      const publicContext = createTestContext();

      // 1. Create Tags
      const tag1 = unwrap(
        await TagService.createTag(adminContext, { name: "Tag1" }),
      );
      const tag2 = unwrap(
        await TagService.createTag(adminContext, { name: "Tag2" }),
      );
      const tag3 = unwrap(
        await TagService.createTag(adminContext, { name: "Tag3" }),
      );

      // 2. Create Main Post (Tags: T1, T2)
      const { id: mainId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: mainId,
        data: {
          title: "Main Post",
          slug: "main-post",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: mainId,
        tagIds: [tag1.id, tag2.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: mainId }));

      // 3. Create High Relevance Post (Tags: T1, T2) -> 2 matches
      const { id: highId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: highId,
        data: {
          title: "High Relevance",
          slug: "high-rel",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: highId,
        tagIds: [tag1.id, tag2.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: highId }));

      // 4. Create Low Relevance Post (Tags: T1) -> 1 match
      const { id: lowId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: lowId,
        data: {
          title: "Low Relevance",
          slug: "low-rel",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: lowId,
        tagIds: [tag1.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: lowId }));

      // 5. Create Unrelated Post (Tags: T3) -> 0 matches
      const { id: unrelatedId } =
        await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: unrelatedId,
        data: {
          title: "Unrelated",
          slug: "unrelated",
          publishedAt: new Date(),
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: unrelatedId,
        tagIds: [tag3.id],
      });
      unwrap(await PostService.publishPost(adminContext, { id: unrelatedId }));

      // 6. Create Draft Post (Tags: T1, T2) -> High match but draft
      const { id: draftId } = await PostService.createEmptyPost(adminContext);
      await updatePost({
        id: draftId,
        data: {
          title: "Draft High Rel",
          slug: "draft-rel", // Should be ignored
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: draftId,
        tagIds: [tag1.id, tag2.id],
      });

      // Act: Get Related Posts
      const related = await PostService.getRelatedPosts(publicContext, {
        slug: "main-post",
        limit: 10,
      });

      // Assert
      expect(related).toHaveLength(2);

      // Rank 1: High Relevance (2 matches)
      expect(related[0].title).toBe("High Relevance");
      expect(related[0].id).toBe(highId);

      // Rank 2: Low Relevance (1 match)
      expect(related[1].title).toBe("Low Relevance");
      expect(related[1].id).toBe(lowId);

      // Verify Exclusions
      const ids = related.map((p) => p.id);
      expect(ids).not.toContain(unrelatedId);
      expect(ids).not.toContain(draftId);
      expect(ids).not.toContain(mainId); // Should not contain itself
    });
  });

  describe("PostRevisionService", () => {
    it("creates an auto revision from the current post snapshot", async () => {
      const tag = unwrap(
        await TagService.createTag(adminContext, { name: "revision-tag" }),
      );
      const { id } = await PostService.createEmptyPost(adminContext);

      await updatePost({
        id,
        data: {
          title: "Versioned Post",
          summary: "Snapshot summary",
          slug: "versioned-post",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Hello revision history" }],
              },
            ],
          },
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: id,
        tagIds: [tag.id],
      });

      const revision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: id,
        }),
      );

      expect(revision.created).toBe(true);
      expect(revision.revision?.reason).toBe("auto");
      expect(revision.revision?.snapshotJson).toEqual({
        title: "Versioned Post",
        summary: "Snapshot summary",
        slug: "versioned-post",
        status: "draft",
        publishedAt: null,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello revision history" }],
            },
          ],
        },
        tagIds: [tag.id],
      });
    });

    it("lists revisions in reverse chronological order", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);

      await updatePost({
        id,
        data: {
          title: "First Version",
          slug: "first-version",
        },
      });
      const firstRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: id,
          reason: "publish",
        }),
      );

      await updatePost({
        id,
        data: {
          title: "Second Version",
          slug: "second-version",
        },
      });
      const secondRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: id,
          reason: "publish",
        }),
      );

      const revisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: id,
        },
      );

      expect(revisions).toHaveLength(2);
      expect(revisions[0]?.id).toBe(secondRevision.revision?.id);
      expect(revisions[0]?.title).toBe("Second Version");
      expect(revisions[1]?.id).toBe(firstRevision.revision?.id);
      expect(revisions[1]?.title).toBe("First Version");
    });

    it("restores a revision and creates a restore backup from the current state", async () => {
      const originalTag = unwrap(
        await TagService.createTag(adminContext, { name: "original-tag" }),
      );
      const updatedTag = unwrap(
        await TagService.createTag(adminContext, { name: "updated-tag" }),
      );
      const { id } = await PostService.createEmptyPost(adminContext);

      await updatePost({
        id,
        data: {
          title: "Original Title",
          summary: "Original Summary",
          slug: "original-title",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Original content" }],
              },
            ],
          },
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: id,
        tagIds: [originalTag.id],
      });

      const originalRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: id,
        }),
      );

      await updatePost({
        id,
        data: {
          title: "Updated Title",
          summary: "Updated Summary",
          slug: "updated-title",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Updated content" }],
              },
            ],
          },
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: id,
        tagIds: [updatedTag.id],
      });

      const restoreResult = unwrap(
        await PostRevisionService.restorePostRevision(adminContext, {
          postId: id,
          revisionId: originalRevision.revision!.id,
        }),
      );
      await waitForBackgroundTasks(adminContext.executionCtx);

      expect(restoreResult.restored).toBe(true);
      expect(restoreResult.post.title).toBe("Original Title");
      expect(restoreResult.post.summary).toBe("Original Summary");
      expect(restoreResult.post.slug).toBe("original-title");
      expect(restoreResult.post.tags.map((tag) => tag.id)).toEqual([
        originalTag.id,
      ]);
      expect(restoreResult.post.contentJson).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Original content" }],
          },
        ],
      });

      const revisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: id,
        },
      );
      expect(revisions).toHaveLength(2);
      expect(revisions[0]?.reason).toBe("restore_backup");
      expect(revisions[0]?.restoredFromRevisionId).toBe(
        originalRevision.revision!.id,
      );
      expect(revisions[0]?.title).toBe("Updated Title");
      expect(revisions[1]?.id).toBe(originalRevision.revision!.id);
    });

    it("does not create a restore backup when the target revision matches the current post", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);

      await updatePost({
        id,
        data: {
          title: "Stable Title",
          slug: "stable-title",
        },
      });

      const revision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: id,
        }),
      );

      const restoreResult = unwrap(
        await PostRevisionService.restorePostRevision(adminContext, {
          postId: id,
          revisionId: revision.revision!.id,
        }),
      );

      expect(restoreResult.restored).toBe(false);

      const revisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: id,
        },
      );
      expect(revisions).toHaveLength(1);
      expect(revisions[0]?.id).toBe(revision.revision?.id);
    });

    it("deletes multiple revisions for the current post only", async () => {
      const { id: firstPostId } =
        await PostService.createEmptyPost(adminContext);
      const { id: secondPostId } =
        await PostService.createEmptyPost(adminContext);

      await updatePost({
        id: firstPostId,
        data: {
          title: "First post v1",
          slug: "first-post-v1",
        },
      });
      const firstRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: firstPostId,
          reason: "publish",
        }),
      );

      await updatePost({
        id: firstPostId,
        data: {
          title: "First post v2",
          slug: "first-post-v2",
        },
      });
      const secondRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: firstPostId,
          reason: "publish",
        }),
      );

      await updatePost({
        id: secondPostId,
        data: {
          title: "Second post v1",
          slug: "second-post-v1",
        },
      });
      const untouchedRevision = unwrap(
        await PostRevisionService.createPostRevision(adminContext, {
          postId: secondPostId,
          reason: "publish",
        }),
      );

      const result = unwrap(
        await PostRevisionService.deletePostRevisions(adminContext, {
          postId: firstPostId,
          revisionIds: [
            firstRevision.revision!.id,
            secondRevision.revision!.id,
            untouchedRevision.revision!.id,
          ],
        }),
      );

      expect(result.deletedCount).toBe(2);
      expect(result.deletedIds.sort((a, b) => a - b)).toEqual(
        [firstRevision.revision!.id, secondRevision.revision!.id].sort(
          (a, b) => a - b,
        ),
      );

      const firstPostRevisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: firstPostId,
        },
      );
      const secondPostRevisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: secondPostId,
        },
      );

      expect(firstPostRevisions).toHaveLength(0);
      expect(secondPostRevisions).toHaveLength(1);
      expect(secondPostRevisions[0]?.id).toBe(untouchedRevision.revision!.id);
    });

    it("creates a publish revision when starting the publish workflow", async () => {
      const tag = unwrap(
        await TagService.createTag(adminContext, { name: "publish-tag" }),
      );
      const { id } = await PostService.createEmptyPost(adminContext);
      const publishedAt = new Date("2026-03-14T10:00:00.000Z");

      await updatePost({
        id,
        data: {
          title: "Published Revision",
          summary: "Before workflow",
          slug: "published-revision",
          publishedAt,
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Published body" }],
              },
            ],
          },
        },
      });
      await TagService.setPostTags(adminContext, {
        postId: id,
        tagIds: [tag.id],
      });

      unwrap(await PostService.publishPost(adminContext, { id }));

      const revisions = await PostRevisionService.listPostRevisions(
        adminContext,
        {
          postId: id,
        },
      );

      expect(revisions).toHaveLength(1);
      expect(revisions[0]?.reason).toBe("publish");

      const revision = await PostRevisionService.findPostRevisionById(
        adminContext,
        {
          postId: id,
          revisionId: revisions[0]!.id,
        },
      );
      expect(revision?.snapshotJson).toEqual({
        title: "Published Revision",
        summary: "Before workflow",
        slug: "published-revision",
        status: "published",
        publishedAt: publishedAt.toISOString(),
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Published body" }],
            },
          ],
        },
        tagIds: [tag.id],
      });
    });

    it("returns an error when restoring a revision with an invalid snapshot", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);

      await updatePost({
        id,
        data: {
          title: "Current Title",
          slug: "current-title",
        },
      });

      const [invalidRevision] = await adminContext.db
        .insert(PostRevisionsTable)
        .values({
          postId: id,
          reason: "auto",
          snapshotHash: "invalid-hash",
          snapshotJson: {
            title: "Broken Snapshot",
          } as never,
        })
        .returning();

      const result = await PostRevisionService.restorePostRevision(
        adminContext,
        {
          postId: id,
          revisionId: invalidRevision.id,
        },
      );

      expect(result.error?.reason).toBe("POST_REVISION_INVALID_SNAPSHOT");
    });
  });

  describe("Publish", () => {
    beforeEach(async () => {
      vi.restoreAllMocks();
      adminContext = createAdminTestContext({
        executionCtx: createMockExecutionCtx(),
      });
      await seedUser(adminContext.db, adminContext.session.user);
    });

    it("stores highlighted code in the public snapshot", async () => {
      const { id } = await PostService.createEmptyPost(adminContext);
      unwrap(
        await PostService.updatePost(adminContext, {
          id,
          data: {
            title: "Highlighted Snapshot",
            slug: "highlighted-snapshot",
            summary: "already summarized",
            publishedAt: new Date(),
            contentJson: {
              type: "doc",
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: "ts" },
                  content: [{ type: "text", text: "const answer = 42;" }],
                },
              ],
            },
          },
        }),
      );

      unwrap(await PostService.publishPost(adminContext, { id }));

      const updatedPost = await adminContext.db.query.PostsTable.findFirst({
        where: eq(PostsTable.id, id),
      });
      const codeBlock =
        updatedPost?.publicSnapshotJson?.contentJson?.content?.find(
          (node) => node.type === "codeBlock",
        );

      expect(codeBlock?.attrs?.highlightedHtml).toEqual(
        expect.stringContaining("const"),
      );
    });

    it("shows the first Published Post after rotating an empty public list", async () => {
      const emptyList = await PostService.getPostsCursor(adminContext, {
        limit: 10,
      });
      expect(emptyList.items).toEqual([]);
      await drainTestExecutionContexts();

      const { id } = await PostService.createEmptyPost(adminContext);
      unwrap(
        await PostService.updatePost(adminContext, {
          id,
          data: {
            title: "First Published Post",
            slug: "first-published-post",
            summary: "Ready for the public list",
            publishedAt: new Date(),
            contentJson: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First post body" }],
                },
              ],
            },
          },
        }),
      );
      unwrap(await PostService.publishPost(adminContext, { id }));
      await waitForBackgroundTasks(adminContext.executionCtx);

      const refreshedList = await PostService.getPostsCursor(adminContext, {
        limit: 10,
      });
      expect(refreshedList.items.map((post) => post.slug)).toContain(
        "first-published-post",
      );
    });
  });
});
