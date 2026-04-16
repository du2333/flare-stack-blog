import { remove } from "@orama/orama";
import {
  createAdminTestContext,
  createTestContext,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import * as CacheService from "@/features/cache/cache.service";
import * as PostService from "@/features/posts/services/posts.service";
import { getOramaDb, persistOramaDb } from "@/features/search/model/store";
import * as SearchService from "@/features/search/service/search.service";
import { TAGS_CACHE_KEYS } from "@/features/tags/tags.schema";
import * as TagService from "@/features/tags/tags.service";
import { PostsTable, PostTagsTable, TagsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

describe("Tags & Search Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);
  });

  describe("TagService", () => {
    describe("Public Queries", () => {
      it("should return empty list when no tags exist", async () => {
        const publicCtx = createTestContext();
        const result = await TagService.getTags(publicCtx);
        expect(result).toHaveLength(0);
      });

      it("should return tags sorted by name", async () => {
        unwrap(await TagService.createTag(adminContext, { name: "b-tag" }));
        unwrap(await TagService.createTag(adminContext, { name: "a-tag" }));

        const result = await TagService.getTags(adminContext, {
          sortBy: "name",
          sortDir: "asc",
        });
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe("a-tag");
        expect(result[1].name).toBe("b-tag");
      });

      it("should return tags with post counts", async () => {
        const tag1 = unwrap(
          await TagService.createTag(adminContext, { name: "tag1" }),
        );
        const tag2 = unwrap(
          await TagService.createTag(adminContext, { name: "tag2" }),
        );

        const post1 = await PostService.createEmptyPost(adminContext);
        unwrap(
          await PostService.updatePost(adminContext, {
            id: post1.id,
            data: {
              title: "Post 1",
              slug: "post-1",
              status: "published",
              publishedAt: new Date(Date.now() - 10000),
            },
          }),
        );
        await TagService.setPostTags(adminContext, {
          postId: post1.id,
          tagIds: [tag1.id],
        });

        const post2 = await PostService.createEmptyPost(adminContext);
        await TagService.setPostTags(adminContext, {
          postId: post2.id,
          tagIds: [tag2.id],
        });

        const result = await TagService.getTags(adminContext, {
          withCount: true,
        });

        const t1 = result.find((t) => t.id === tag1.id);
        const t2 = result.find((t) => t.id === tag2.id);

        expect(t1).toEqual(expect.objectContaining({ postCount: 1 }));
        expect(t2).toEqual(expect.objectContaining({ postCount: 1 }));
      });

      it("should filter public tags (only published posts)", async () => {
        const tag1 = unwrap(
          await TagService.createTag(adminContext, { name: "tag1" }),
        );
        const tag2 = unwrap(
          await TagService.createTag(adminContext, { name: "tag2" }),
        );

        const post1 = await PostService.createEmptyPost(adminContext);
        unwrap(
          await PostService.updatePost(adminContext, {
            id: post1.id,
            data: {
              title: "Post 1",
              slug: "post-1",
              status: "published",
              publishedAt: new Date(Date.now() - 10000),
            },
          }),
        );
        await TagService.setPostTags(adminContext, {
          postId: post1.id,
          tagIds: [tag1.id],
        });

        const post2 = await PostService.createEmptyPost(adminContext);
        await TagService.setPostTags(adminContext, {
          postId: post2.id,
          tagIds: [tag2.id],
        });

        const result = await TagService.getTags(adminContext, {
          withCount: true,
          publicOnly: true,
        });

        const t1 = result.find((t) => t.id === tag1.id);
        const t2 = result.find((t) => t.id === tag2.id);

        expect(t1).toBeDefined();
        expect(t1).toEqual(expect.objectContaining({ postCount: 1 }));

        if (t2) {
          expect(t2).toEqual(expect.objectContaining({ postCount: 0 }));
        }
      });
    });

    describe("Caching", () => {
      it("should cache public tags list", async () => {
        const tag = unwrap(
          await TagService.createTag(adminContext, { name: "cached-tag" }),
        );

        const post = await PostService.createEmptyPost(adminContext);
        unwrap(
          await PostService.updatePost(adminContext, {
            id: post.id,
            data: {
              title: "Post",
              slug: "post",
              status: "published",
              publishedAt: new Date(Date.now() - 10000),
            },
          }),
        );
        await TagService.setPostTags(adminContext, {
          postId: post.id,
          tagIds: [tag.id],
        });

        const result1 = await TagService.getPublicTags(adminContext);
        expect(result1).toHaveLength(1);

        await waitForBackgroundTasks(adminContext.executionCtx);

        const cached = await CacheService.getRaw(
          adminContext,
          TAGS_CACHE_KEYS.publicList,
        );
        expect(cached).not.toBeNull();

        const result2 = await TagService.getPublicTags(adminContext);
        expect(result2).toEqual(result1);
      });
    });

    describe("Admin Operations", () => {
      it("should return TAG_NAME_ALREADY_EXISTS for duplicate tag", async () => {
        unwrap(await TagService.createTag(adminContext, { name: "dup-tag" }));
        const result = await TagService.createTag(adminContext, {
          name: "dup-tag",
        });
        expect(result.error?.reason).toBe("TAG_NAME_ALREADY_EXISTS");
      });

      it("should update tag and invalidate cache", async () => {
        const tag = unwrap(
          await TagService.createTag(adminContext, { name: "old-name" }),
        );

        await TagService.getPublicTags(adminContext);

        unwrap(
          await TagService.updateTag(adminContext, {
            id: tag.id,
            data: { name: "new-name" },
          }),
        );
        await waitForBackgroundTasks(adminContext.executionCtx);

        const cached = await CacheService.getRaw(
          adminContext,
          TAGS_CACHE_KEYS.publicList,
        );
        expect(cached).toBeNull();

        const updated = await TagService.getTags(adminContext);
        expect(updated.find((t) => t.id === tag.id)?.name).toBe("new-name");
      });

      it("should delete tag and invalidate cache", async () => {
        const tag = unwrap(
          await TagService.createTag(adminContext, { name: "delete-me" }),
        );

        await TagService.getPublicTags(adminContext);

        await TagService.deleteTag(adminContext, { id: tag.id });
        await waitForBackgroundTasks(adminContext.executionCtx);

        const cached = await CacheService.getRaw(
          adminContext,
          TAGS_CACHE_KEYS.publicList,
        );
        expect(cached).toBeNull();

        const result = await TagService.getTags(adminContext);
        const found = result.find((t) => t.id === tag.id);
        expect(found).toBeUndefined();
      });
    });
  });

  describe("SearchService", () => {
    it("should upsert and search for a document", async () => {
      const context = createAdminTestContext();
      const doc = {
        id: 1,
        slug: "test-post",
        title: "Test Post Title",
        summary: "This is a summary of the test post.",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This is the content." }],
            },
          ],
        },
        tags: ["tag1", "tag2"],
      };

      await SearchService.upsert(context, doc);

      const results = await SearchService.search(context, {
        q: "Title",
        v: "1",
        limit: 10,
      });
      expect(results).toHaveLength(1);
      expect(results[0].post.title).toBe(doc.title);
      expect(results[0].post.slug).toBe(doc.slug);
    });

    it("should delete a document from index", async () => {
      const context = createAdminTestContext();
      const doc = {
        id: 2,
        slug: "test-post-2",
        title: "To Be Deleted",
        summary: "Summary",
        contentJson: null,
        tags: [],
      };
      await SearchService.upsert(context, doc);

      let results = await SearchService.search(context, {
        q: "Deleted",
        v: "1",
        limit: 10,
      });
      expect(results).toHaveLength(1);

      await SearchService.deleteIndex(context, { id: doc.id });

      results = await SearchService.search(context, {
        q: "Deleted",
        v: "1",
        limit: 10,
      });
      expect(results).toHaveLength(0);
    });

    it("should rebuild index from database", async () => {
      const context = createAdminTestContext();
      await seedUser(context.db, context.session.user);

      const postData = {
        id: 3,
        title: "Database Post",
        slug: "db-post",
        summary: "From DB",
        contentJson: { type: "doc", content: [] },
        publishedAt: new Date(),
        status: "published" as const,
        readTimeInMinutes: 1,
      };

      await context.db.insert(PostsTable).values(postData);

      const tagData = {
        id: 1,
        name: "dbtag",
      };
      await context.db.insert(TagsTable).values(tagData);

      await context.db.insert(PostTagsTable).values({
        postId: postData.id,
        tagId: tagData.id,
      });

      const db = await getOramaDb(context.env);
      try {
        await remove(db, postData.id.toString());
        await persistOramaDb(context.env, db);
      } catch {}

      await SearchService.rebuildIndex(context);

      const results = await SearchService.search(context, {
        q: "Database",
        v: "1",
        limit: 10,
      });
      expect(results).toHaveLength(1);
      expect(results[0].post.title).toBe(postData.title);
      expect(results[0].post.tags).toContain("dbtag");
    });
  });
});
