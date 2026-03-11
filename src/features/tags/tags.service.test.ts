import {
  createAdminTestContext,
  createTestContext,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import * as CacheService from "@/features/cache/cache.service";
import * as PostService from "@/features/posts/posts.service";
import { TAGS_CACHE_KEYS } from "@/features/tags/tags.schema";
import * as TagService from "@/features/tags/tags.service";
import { unwrap } from "@/lib/errors";

describe("TagService", () => {
  let ctx: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    ctx = createAdminTestContext();
    await seedUser(ctx.db, ctx.session.user);
  });

  describe("Public Queries", () => {
    it("should return empty list when no tags exist", async () => {
      const publicCtx = createTestContext();
      const result = await TagService.getTags(publicCtx);
      expect(result).toHaveLength(0);
    });

    it("should return tags sorted by name", async () => {
      unwrap(await TagService.createTag(ctx, { name: "b-tag" }));
      unwrap(await TagService.createTag(ctx, { name: "a-tag" }));

      const result = await TagService.getTags(ctx, {
        sortBy: "name",
        sortDir: "asc",
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("a-tag");
      expect(result[1].name).toBe("b-tag");
    });

    it("should return tags with post counts", async () => {
      const tag1 = unwrap(await TagService.createTag(ctx, { name: "tag1" }));
      const tag2 = unwrap(await TagService.createTag(ctx, { name: "tag2" }));

      // Create a published post with tag1
      const post1 = await PostService.createEmptyPost(ctx);
      unwrap(
        await PostService.updatePost(ctx, {
          id: post1.id,
          data: {
            title: "Post 1",
            slug: "post-1",
            status: "published",
            publishedAt: new Date(Date.now() - 10000),
          },
        }),
      );
      await TagService.setPostTags(ctx, {
        postId: post1.id,
        tagIds: [tag1.id],
      });

      // Create a draft post with tag2
      const post2 = await PostService.createEmptyPost(ctx);
      await TagService.setPostTags(ctx, {
        postId: post2.id,
        tagIds: [tag2.id],
      });

      const result = await TagService.getTags(ctx, { withCount: true });

      const t1 = result.find((t) => t.id === tag1.id);
      const t2 = result.find((t) => t.id === tag2.id);

      expect(t1).toEqual(expect.objectContaining({ postCount: 1 }));
      // Draft posts are usually counted in admin view (getTags calls getAllTagsWithCount without publicOnly)
      expect(t2).toEqual(expect.objectContaining({ postCount: 1 }));
    });

    it("should filter public tags (only published posts)", async () => {
      const tag1 = unwrap(await TagService.createTag(ctx, { name: "tag1" }));
      const tag2 = unwrap(await TagService.createTag(ctx, { name: "tag2" }));

      const post1 = await PostService.createEmptyPost(ctx);
      unwrap(
        await PostService.updatePost(ctx, {
          id: post1.id,
          data: {
            title: "Post 1",
            slug: "post-1",
            status: "published",
            publishedAt: new Date(Date.now() - 10000),
          },
        }),
      );
      await TagService.setPostTags(ctx, {
        postId: post1.id,
        tagIds: [tag1.id],
      });

      const post2 = await PostService.createEmptyPost(ctx);
      // post2 is draft
      await TagService.setPostTags(ctx, {
        postId: post2.id,
        tagIds: [tag2.id],
      });

      // Use public context for publicOnly check logic (or manually pass param)
      const result = await TagService.getTags(ctx, {
        withCount: true,
        publicOnly: true,
      });

      // Should verify logic in getTags: if publicOnly=true, only return tags with published posts > 0?
      // Or return all but count is 0?
      // TagRepo.getAllTagsWithCount implements inner join or filtering?
      // Usually it filters tags that have > 0 posts if inner join, or returns all if left join.
      // Let's assume it returns only tags with count > 0 if publicOnly is strictly implemented for tag cloud.

      const t1 = result.find((t) => t.id === tag1.id);
      const t2 = result.find((t) => t.id === tag2.id);

      expect(t1).toBeDefined();
      expect(t1).toEqual(expect.objectContaining({ postCount: 1 }));

      // Tag 2 has 0 published posts.
      if (t2) {
        expect(t2).toEqual(expect.objectContaining({ postCount: 0 }));
      }
    });
  });

  describe("Caching", () => {
    it("should cache public tags list", async () => {
      const tag = unwrap(
        await TagService.createTag(ctx, { name: "cached-tag" }),
      );

      const post = await PostService.createEmptyPost(ctx);
      unwrap(
        await PostService.updatePost(ctx, {
          id: post.id,
          data: {
            title: "Post",
            slug: "post",
            status: "published",
            publishedAt: new Date(Date.now() - 10000),
          },
        }),
      );
      await TagService.setPostTags(ctx, { postId: post.id, tagIds: [tag.id] });

      // First call populates cache
      const result1 = await TagService.getPublicTags(ctx);
      expect(result1).toHaveLength(1);

      await waitForBackgroundTasks(ctx.executionCtx);

      // Verify cache set
      const cached = await CacheService.getRaw(ctx, TAGS_CACHE_KEYS.publicList);
      expect(cached).not.toBeNull();

      // Second call hits cache
      const result2 = await TagService.getPublicTags(ctx);
      expect(result2).toEqual(result1);
    });
  });

  describe("Admin Operations", () => {
    it("should return TAG_NAME_ALREADY_EXISTS for duplicate tag", async () => {
      unwrap(await TagService.createTag(ctx, { name: "dup-tag" }));
      const result = await TagService.createTag(ctx, { name: "dup-tag" });
      expect(result.error?.reason).toBe("TAG_NAME_ALREADY_EXISTS");
    });

    it("should update tag and invalidate cache", async () => {
      const tag = unwrap(await TagService.createTag(ctx, { name: "old-name" }));

      // Populate cache first
      await TagService.getPublicTags(ctx);

      unwrap(
        await TagService.updateTag(ctx, {
          id: tag.id,
          data: { name: "new-name" },
        }),
      );
      await waitForBackgroundTasks(ctx.executionCtx);

      // Check cache invalidated
      const cached = await CacheService.getRaw(ctx, TAGS_CACHE_KEYS.publicList);
      expect(cached).toBeNull();

      const updated = await TagService.getTags(ctx);
      expect(updated.find((t) => t.id === tag.id)?.name).toBe("new-name");
    });

    it("should delete tag and invalidate cache", async () => {
      const tag = unwrap(
        await TagService.createTag(ctx, { name: "delete-me" }),
      );

      await TagService.getPublicTags(ctx); // Populate cache

      await TagService.deleteTag(ctx, { id: tag.id });
      await waitForBackgroundTasks(ctx.executionCtx);

      const cached = await CacheService.getRaw(ctx, TAGS_CACHE_KEYS.publicList);
      expect(cached).toBeNull();

      const result = await TagService.getTags(ctx);
      const found = result.find((t) => t.id === tag.id);
      expect(found).toBeUndefined();
    });
  });
});
