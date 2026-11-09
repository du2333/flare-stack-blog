import { seedSystemConfig } from "tests/config-fixture";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  CommentSelectSchema,
  GetRootCommentsResponseSchema,
} from "@/features/comments/comments.schema";
import * as CommentService from "@/features/comments/comments.service";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as EmailData from "@/features/email/data/email.data";
import * as PostService from "@/features/posts/services/posts.service";
import { CommentsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

describe("Comments Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;
  let postId: number;

  beforeEach(async () => {
    // Setup admin context
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);

    // Setup normal user context
    const userSession = createMockSession({
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: null,
      },
    });
    userContext = createAuthTestContext({ session: userSession });
    await seedUser(userContext.db, userSession.user);
  });

  describe("CommentService", () => {
    beforeEach(async () => {
      // Create a published post for comments
      const { id } = await PostService.createEmptyPost(adminContext);
      unwrap(
        await PostService.updatePost(adminContext, {
          id,
          data: {
            title: "Test Post",
            slug: `test-post-${Date.now()}`,
          },
        }),
      );
      unwrap(await PostService.publishPost(adminContext, { id }));
      postId = id;

      await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
    });

    describe("Comment Creation", () => {
      it("should create a published comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Great post!",
          }),
        );

        expect(comment.status).toBe("published");
        expect(comment.userId).toBe("user-1");
        expect(comment.postId).toBe(postId);
      });

      it("should create a reply to an existing comment", async () => {
        const parent = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Parent comment",
          }),
        );

        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Reply to parent",
            rootId: parent.id,
          }),
        );

        expect(reply.rootId).toBe(parent.id);
        expect(reply.replyToCommentId).toBe(parent.id);
      });

      it("should reject a comment when the post has no Public Content Snapshot", async () => {
        const { id: draftId } = await PostService.createEmptyPost(adminContext);

        const result = await CommentService.createComment(userContext, {
          postId: draftId,
          content: "On a draft",
        });

        expect(result.error?.reason).toBe("POST_NOT_PUBLISHED");
      });

      it("should reject a comment after the post is unpublished", async () => {
        unwrap(await PostService.unpublishPost(adminContext, { id: postId }));

        const result = await CommentService.createComment(userContext, {
          postId,
          content: "After unpublish",
        });

        expect(result.error?.reason).toBe("POST_NOT_PUBLISHED");
      });
    });

    describe("Comment Deletion", () => {
      it("should allow user to soft delete their own comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "My comment",
          }),
        );

        await CommentService.deleteComment(userContext, {
          id: comment.id,
        });

        const deletedComment = await CommentRepo.findCommentById(
          userContext.db,
          comment.id,
        );
        expect(deletedComment?.status).toBe("deleted");
      });

      it("should prevent user from deleting another user's comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "User 1's comment",
          }),
        );

        // Create another user context
        const otherUserSession = createMockSession({
          user: {
            id: "user-2",
            name: "Other User",
            email: "other@example.com",
            role: null,
          },
        });
        const otherUserContext = createAuthTestContext({
          session: otherUserSession,
        });
        await seedUser(otherUserContext.db, otherUserSession.user);

        const result = await CommentService.deleteComment(otherUserContext, {
          id: comment.id,
        });
        expect(result.error?.reason).toBe("PERMISSION_DENIED");
      });

      it("should allow admin to soft delete any comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "To be deleted by admin",
          }),
        );

        unwrap(
          await CommentService.deleteComment(adminContext, {
            id: comment.id,
          }),
        );

        const stored = await CommentRepo.findCommentById(
          adminContext.db,
          comment.id,
        );
        expect(stored?.status).toBe("deleted");

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(
          result.items.find((item) => item.id === comment.id),
        ).toBeUndefined();
        expect(result.total).toBe(0);
      });
    });

    describe("Public Comment Queries", () => {
      it("should get root comments by post ID with reply counts", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root comment",
          }),
        );

        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Reply",
            rootId: root.id,
          }),
        );
        expect(reply.status).toBe("published");

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe(root.id);
        expect(result.items[0].replyCount).toBe(1);
        expect(result.items[0].replies).toHaveLength(1);
        expect(result.items[0].replies[0].id).toBe(reply.id);
        expect(result.total).toBe(2);
      });

      it("should get replies by root ID with pagination", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );

        // Create 3 replies
        for (let i = 1; i <= 3; i++) {
          unwrap(
            await CommentService.createComment(userContext, {
              postId,
              content: `Reply ${i}`,
              rootId: root.id,
            }),
          );
        }

        // Get first page
        const page1 = await CommentService.getRepliesByRootId(userContext, {
          postId,
          rootId: root.id,
          limit: 2,
        });

        expect(page1.items).toHaveLength(2);
        expect(page1.total).toBe(3);

        // Get second page
        const page2 = await CommentService.getRepliesByRootId(userContext, {
          postId,
          rootId: root.id,
          limit: 2,
          offset: 2,
        });

        expect(page2.items).toHaveLength(1);
      });

      it("should show a new comment to everyone immediately", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Public comment",
          }),
        );

        const result = await CommentService.getRootComments(adminContext, {
          postId,
        });
        expect(result.items.find((c) => c.id === comment.id)).toBeDefined();
      });

      it("should hide a deleted root with no published replies", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Lonely root",
          }),
        );
        unwrap(
          await CommentService.deleteComment(userContext, { id: root.id }),
        );

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);

        const replies = await CommentService.getRepliesByRootId(userContext, {
          postId,
          rootId: root.id,
        });
        expect(replies.items).toHaveLength(0);
        expect(replies.total).toBe(0);
      });

      it("should keep a deleted root as a placeholder when it has published replies", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );
        unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Still here",
            rootId: root.id,
          }),
        );
        unwrap(
          await CommentService.deleteComment(userContext, { id: root.id }),
        );

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe(root.id);
        expect(result.items[0].status).toBe("deleted");
        expect(result.items[0].replyCount).toBe(1);
        expect(result.total).toBe(1);
      });

      it("should count published comments across all threads while paginating only visible roots", async () => {
        const [firstRoot, secondRoot, deletedRoot, hiddenRoot] =
          await userContext.db
            .insert(CommentsTable)
            .values([
              {
                postId,
                userId: userContext.session.user.id,
                content: "First root",
                status: "published",
                createdAt: new Date("2026-01-01T00:00:00Z"),
              },
              {
                postId,
                userId: userContext.session.user.id,
                content: "Second root",
                status: "published",
                createdAt: new Date("2026-01-02T00:00:00Z"),
              },
              {
                postId,
                userId: userContext.session.user.id,
                content: "Deleted with a surviving reply",
                status: "deleted",
                createdAt: new Date("2026-01-03T00:00:00Z"),
              },
              {
                postId,
                userId: userContext.session.user.id,
                content: "Deleted with no surviving replies",
                status: "deleted",
                createdAt: new Date("2026-01-04T00:00:00Z"),
              },
            ])
            .returning();

        const { id: otherPostId } =
          await PostService.createEmptyPost(adminContext);
        await userContext.db.insert(CommentsTable).values([
          {
            postId,
            rootId: firstRoot.id,
            content: "First reply",
            status: "published",
          },
          {
            postId,
            rootId: firstRoot.id,
            content: "Second reply",
            status: "published",
          },
          {
            postId,
            rootId: deletedRoot.id,
            content: "Surviving reply",
            status: "published",
          },
          {
            postId,
            rootId: firstRoot.id,
            content: "Deleted reply",
            status: "deleted",
          },
          {
            postId,
            rootId: hiddenRoot.id,
            content: "Deleted hidden reply",
            status: "deleted",
          },
          {
            postId: otherPostId,
            content: "Different post",
            status: "published",
          },
        ]);

        const firstPage = await CommentService.getRootComments(userContext, {
          postId,
          limit: 2,
        });
        expect(firstPage.total).toBe(5);
        expect(firstPage.items.map((item) => item.id)).toEqual([
          deletedRoot.id,
          secondRoot.id,
        ]);

        const secondPage = await CommentService.getRootComments(userContext, {
          postId,
          offset: firstPage.items.length,
          limit: 2,
        });
        expect(secondPage.total).toBe(5);
        expect(secondPage.items.map((item) => item.id)).toEqual([firstRoot.id]);

        const end = await CommentService.getRootComments(userContext, {
          postId,
          offset: firstPage.items.length + secondPage.items.length,
          limit: 2,
        });
        expect(end.total).toBe(5);
        expect(end.items).toEqual([]);
      });

      it("should omit deleted replies from replyCount and keep them in the preview", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );
        const first = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "First",
            rootId: root.id,
          }),
        );
        unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Second",
            rootId: root.id,
          }),
        );
        unwrap(
          await CommentService.deleteComment(userContext, { id: first.id }),
        );

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(result.items[0].replyCount).toBe(1);
        expect(result.items[0].replies).toHaveLength(2);
        expect(result.items[0].replies[0].status).toBe("deleted");
        expect(result.items[0].replies[1].status).toBe("published");
        expect(result.total).toBe(2);
      });

      it("should preview the earliest three replies", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );
        for (const content of ["A", "B", "C", "D"]) {
          unwrap(
            await CommentService.createComment(userContext, {
              postId,
              content,
              rootId: root.id,
            }),
          );
        }

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(result.items[0].replyCount).toBe(4);
        expect(result.items[0].replies.map((reply) => reply.content)).toEqual([
          "A",
          "B",
          "C",
        ]);
      });

      it("should resolve previews and reply targets per thread across many roots", async () => {
        const otherSession = createMockSession({
          user: {
            id: "user-2",
            name: "Other User",
            email: "other@example.com",
            role: null,
          },
        });
        await seedUser(userContext.db, otherSession.user);
        const author = userContext.session.user.id;
        const authorName = userContext.session.user.name;
        const other = otherSession.user.id;
        const at = (day: number) => new Date(Date.UTC(2026, 0, day));

        // Roots by age: oldest, anonymous, quiet, lonely, then a deleted one.
        const [oldest, anonymous, quiet, lonely, deletedRoot] =
          await userContext.db
            .insert(CommentsTable)
            .values([
              { postId, userId: author, content: "oldest", createdAt: at(1) },
              { postId, userId: null, content: "anonymous", createdAt: at(2) },
              { postId, userId: other, content: "quiet", createdAt: at(3) },
              { postId, userId: other, content: "lonely", createdAt: at(4) },
              {
                postId,
                userId: other,
                content: "gone",
                status: "deleted",
                createdAt: at(5),
              },
            ])
            .returning();

        const [orphan, , survivor] = await userContext.db
          .insert(CommentsTable)
          .values([
            {
              postId,
              rootId: anonymous.id,
              userId: null,
              content: "orphan",
              createdAt: at(15),
            },
            {
              postId,
              rootId: lonely.id,
              userId: author,
              content: "removed",
              status: "deleted",
              createdAt: at(16),
            },
            {
              postId,
              rootId: deletedRoot.id,
              userId: author,
              content: "survivor",
              createdAt: at(17),
            },
          ])
          .returning();

        // oldest has five replies, inserted newest first so the preview has
        // to follow createdAt. Targets: b -> a, c -> b, d -> the root,
        // e -> a reply whose author is gone. The earliest ("a") is deleted.
        const [a] = await userContext.db
          .insert(CommentsTable)
          .values({
            postId,
            rootId: oldest.id,
            userId: other,
            content: "a",
            status: "deleted",
            createdAt: at(10),
          })
          .returning();
        const [b] = await userContext.db
          .insert(CommentsTable)
          .values({
            postId,
            rootId: oldest.id,
            replyToCommentId: a.id,
            userId: author,
            content: "b",
            createdAt: at(11),
          })
          .returning();
        const [c] = await userContext.db
          .insert(CommentsTable)
          .values({
            postId,
            rootId: oldest.id,
            replyToCommentId: b.id,
            userId: other,
            content: "c",
            createdAt: at(12),
          })
          .returning();
        const [d] = await userContext.db
          .insert(CommentsTable)
          .values({
            postId,
            rootId: oldest.id,
            replyToCommentId: oldest.id,
            userId: author,
            content: "d",
            createdAt: at(13),
          })
          .returning();
        const [e] = await userContext.db
          .insert(CommentsTable)
          .values({
            postId,
            rootId: oldest.id,
            replyToCommentId: orphan.id,
            userId: other,
            content: "e",
            createdAt: at(14),
          })
          .returning();

        const result = await CommentService.getRootComments(userContext, {
          postId,
        });

        // Published: oldest, anonymous, quiet, lonely, b, c, d, e, orphan,
        // survivor.
        expect(result.total).toBe(10);
        expect(
          result.items.map((item) => ({
            id: item.id,
            status: item.status,
            replyCount: item.replyCount,
            replies: item.replies.map((reply) => reply.id),
          })),
        ).toEqual([
          {
            id: deletedRoot.id,
            status: "deleted",
            replyCount: 1,
            replies: [survivor.id],
          },
          // lonely has only a deleted reply, so it shows no preview at all.
          { id: lonely.id, status: "published", replyCount: 0, replies: [] },
          { id: quiet.id, status: "published", replyCount: 0, replies: [] },
          {
            id: anonymous.id,
            status: "published",
            replyCount: 1,
            replies: [orphan.id],
          },
          {
            id: oldest.id,
            status: "published",
            replyCount: 4,
            replies: [a.id, b.id, c.id],
          },
        ]);

        const oldestThread = result.items[4];
        expect(oldestThread.user).toMatchObject({
          id: author,
          name: authorName,
        });
        expect(result.items[3].user).toBeNull();
        expect(result.items[3].replies[0].user).toBeNull();
        expect(oldestThread.replies.map((reply) => reply.replyTo)).toEqual([
          null,
          { id: other, name: "Other User" },
          { id: author, name: authorName },
        ]);
        expect(oldestThread.replies[0].user?.id).toBe(other);
        expect(oldestThread.replies[1].replyToCommentId).toBe(a.id);

        // The paginated replies endpoint resolves the same targets.
        const page = await CommentService.getRepliesByRootId(userContext, {
          postId,
          rootId: oldest.id,
          offset: 2,
          limit: 3,
        });
        expect(page.total).toBe(4);
        expect(page.items.map((reply) => reply.id)).toEqual([c.id, d.id, e.id]);
        expect(page.items.map((reply) => reply.replyTo)).toEqual([
          { id: author, name: authorName },
          { id: author, name: authorName },
          null,
        ]);

        // A thread opened by one of its replies carries the same preview.
        const thread = unwrap(
          await CommentService.getThreadByCommentId(userContext, {
            postId,
            id: e.id,
          }),
        );
        expect(thread).toEqual(oldestThread);
      });

      it("should hide comments on the public list after unpublish and restore them on publish", async () => {
        unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Keep me",
          }),
        );

        unwrap(await PostService.unpublishPost(adminContext, { id: postId }));
        const unpublished = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(unpublished.items).toHaveLength(0);
        expect(unpublished.total).toBe(0);

        unwrap(await PostService.publishPost(adminContext, { id: postId }));
        const published = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(published.items).toHaveLength(1);
        expect(published.items[0].content).toBe("Keep me");
      });

      it("should load a visible thread by a reply id", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );
        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Deep reply",
            rootId: root.id,
          }),
        );

        const thread = unwrap(
          await CommentService.getThreadByCommentId(userContext, {
            postId,
            id: reply.id,
          }),
        );
        expect(thread.id).toBe(root.id);
        expect(thread.replyCount).toBe(1);
        expect(thread.replies[0].id).toBe(reply.id);
      });

      it("should reject a hidden thread lookup", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Hidden",
          }),
        );
        unwrap(
          await CommentService.deleteComment(userContext, { id: root.id }),
        );

        const result = await CommentService.getThreadByCommentId(userContext, {
          postId,
          id: root.id,
        });
        expect(result.error?.reason).toBe("COMMENT_NOT_FOUND");
      });
    });

    describe("Comment Validation - Edge Cases", () => {
      it("should return ROOT_COMMENT_NOT_FOUND when replying to non-existent root", async () => {
        const result = await CommentService.createComment(userContext, {
          postId,
          content: "Reply to nothing",
          rootId: 999999,
        });

        expect(result.error?.reason).toBe("ROOT_COMMENT_NOT_FOUND");
      });

      it("should return INVALID_ROOT_ID when rootId is itself a reply", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );

        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Reply",
            rootId: root.id,
          }),
        );

        // Try to use the reply as a root (should fail)
        const result = await CommentService.createComment(userContext, {
          postId,
          content: "Nested reply",
          rootId: reply.id,
        });

        expect(result.error?.reason).toBe("INVALID_ROOT_ID");
      });

      it("should return ROOT_COMMENT_POST_MISMATCH when root belongs to different post", async () => {
        // Create another post
        const { id: otherPostId } =
          await PostService.createEmptyPost(adminContext);
        unwrap(
          await PostService.updatePost(adminContext, {
            id: otherPostId,
            data: {
              title: "Other Post",
              slug: `other-post-${Date.now()}`,
            },
          }),
        );
        unwrap(
          await PostService.publishPost(adminContext, { id: otherPostId }),
        );

        const otherPostComment = unwrap(
          await CommentService.createComment(userContext, {
            postId: otherPostId,
            content: "Comment on other post",
          }),
        );

        // Try to reply to it from a different post
        const result = await CommentService.createComment(userContext, {
          postId,
          content: "Cross-post reply",
          rootId: otherPostComment.id,
        });

        expect(result.error?.reason).toBe("ROOT_COMMENT_POST_MISMATCH");
      });

      it("should return REPLY_TO_COMMENT_NOT_FOUND when replyToCommentId invalid", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );

        const result = await CommentService.createComment(userContext, {
          postId,
          content: "Reply to invalid",
          rootId: root.id,
          replyToCommentId: 999999,
        });

        expect(result.error?.reason).toBe("REPLY_TO_COMMENT_NOT_FOUND");
      });

      it("should return ROOT_COMMENT_CANNOT_HAVE_REPLY_TO when creating root with replyToCommentId", async () => {
        const existing = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Existing",
          }),
        );

        // Try to create a root comment (no rootId) but with replyToCommentId
        const result = await CommentService.createComment(userContext, {
          postId,
          content: "Invalid root",
          replyToCommentId: existing.id,
        });

        expect(result.error?.reason).toBe("ROOT_COMMENT_CANNOT_HAVE_REPLY_TO");
      });
    });

    describe("Admin Comment Behavior", () => {
      it("admin comments should be published immediately (skip moderation)", async () => {
        const comment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin comment",
          }),
        );

        expect(comment.status).toBe("published");
      });

      it("should enqueue admin notification email on new root comment", async () => {
        await CommentService.createComment(userContext, {
          postId,
          content: "New root comment for notification",
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "EMAIL",
            data: expect.objectContaining({
              to: "admin@example.com",
              subject: expect.stringContaining("Test Post"),
            }),
          }),
        );
      });

      it("should enqueue both email and webhook when both channels are enabled", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: true,
              },
            },
            webhook: {
              url: "https://example.com/webhook",
              secret: "secret",
            },
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "Dual channel comment",
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(2);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({ type: "EMAIL" }),
        );
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({ type: "WEBHOOK" }),
        );
      });

      it("should enqueue admin webhook without email when admin email is disabled", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
              },
            },
            webhook: {
              url: "https://example.com/webhook",
              secret: "secret",
            },
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "Webhook only notification",
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              url: "https://example.com/webhook",
              event: expect.objectContaining({
                type: "comment.admin_root_created",
                data: expect.not.objectContaining({
                  to: expect.anything(),
                }),
              }),
            }),
          }),
        );
      });

      it("should send webhook from the first legacy endpoint even if that row filtered events", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: false,
              },
            },
            webhooks: [
              {
                id: "legacy-first",
                name: "Legacy First",
                url: "https://example.com/legacy",
                enabled: true,
                secret: "legacy-secret",
                events: ["friend_link.submitted"],
              },
              {
                id: "legacy-second",
                name: "Legacy Second",
                url: "https://example.com/other",
                enabled: true,
                secret: "other-secret",
                events: ["comment.admin_root_created"],
              },
            ],
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "Legacy webhook config",
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              url: "https://example.com/legacy",
              secret: "legacy-secret",
              event: expect.objectContaining({
                type: "comment.admin_root_created",
              }),
            }),
          }),
        );
      });

      it("should not enqueue webhook when the URL is empty", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
              },
            },
            webhook: {
              url: "",
              secret: "secret",
            },
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "Comment with empty webhook URL",
        });

        expect(userContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("links notifications to the published Post, not a draft slug changed since", async () => {
        const published = await PostService.findPostById(adminContext, {
          id: postId,
        });
        const publicSlug = published!.publicSlug!;
        unwrap(
          await PostService.updatePost(adminContext, {
            id: postId,
            data: { slug: `${publicSlug}-renamed-draft` },
          }),
        );
        vi.mocked(userContext.env.QUEUE.send).mockClear();

        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root after a draft rename",
          }),
        );
        const reply = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Reply after a draft rename",
            rootId: root.id,
          }),
        );

        const htmls = vi
          .mocked(userContext.env.QUEUE.send)
          .mock.calls.map(
            ([message]) => (message as { data: { html?: string } }).data.html,
          );
        expect(htmls).toHaveLength(2);
        expect(htmls[0]).toContain(`/post/${publicSlug}?comment=${root.id}`);
        expect(htmls[1]).toContain(`/post/${publicSlug}?comment=${reply.id}`);
        expect(htmls.join("")).not.toContain("renamed-draft");
      });

      it("names the published Post in notifications, not a draft title changed since", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: { channels: { email: true } },
            webhook: { url: "https://example.com/webhook", secret: "secret" },
          },
        });
        unwrap(
          await PostService.updatePost(adminContext, {
            id: postId,
            data: { title: "Draft Title Not Yet Published" },
          }),
        );
        vi.mocked(userContext.env.QUEUE.send).mockClear();

        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root after a draft retitle",
          }),
        );
        await CommentService.createComment(adminContext, {
          postId,
          content: "Reply after a draft retitle",
          rootId: root.id,
        });

        const messages = vi.mocked(userContext.env.QUEUE.send).mock.calls.map(
          ([message]) =>
            message as {
              type: string;
              data: {
                subject?: string;
                event?: { data: { postTitle: string } };
              };
            },
        );
        const webhook = messages.find((message) => message.type === "WEBHOOK");
        expect(webhook?.data.event?.data.postTitle).toBe("Test Post");
        const subjects = messages
          .filter((message) => message.type === "EMAIL")
          .map((message) => message.data.subject);
        expect(subjects).toHaveLength(2);
        for (const subject of subjects) {
          expect(subject).toContain("Test Post");
          expect(subject).not.toContain("Draft Title");
        }
      });

      it("should enqueue reply notification email when admin replies to a user comment", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "User's comment",
          }),
        );

        // Clear mocks to isolate the admin reply notification
        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        // Admin replies to the user's comment
        await CommentService.createComment(adminContext, {
          postId,
          content: "Admin reply",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "EMAIL",
            data: expect.objectContaining({
              to: "user@example.com",
              subject: expect.stringContaining("回复"),
            }),
          }),
        );
      });

      it("should skip user reply notification when user email notifications are disabled", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            user: {
              emailEnabled: false,
            },
          },
        });

        const rootComment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "User comment",
          }),
        );

        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(adminContext, {
          postId,
          content: "Admin reply",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should skip reply notification when the replied user's account was deleted", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "User comment from deleted account",
          }),
        );

        await adminContext.db
          .update(CommentsTable)
          .set({ userId: null })
          .where(eq(CommentsTable.id, rootComment.id));

        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(adminContext, {
          postId,
          content: "Admin reply after account deletion",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should not trigger reply notification when admin replies to own comment", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin's root comment",
          }),
        );

        // Clear mocks
        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        // Admin replies to own comment
        await CommentService.createComment(adminContext, {
          postId,
          content: "Admin self-reply",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        // No notification should be sent (self-reply)
        expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should enqueue a reply notification when a user replies to an admin", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin's root comment",
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "User reply to admin",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "EMAIL",
            data: expect.objectContaining({
              to: "admin@example.com",
              subject: expect.stringContaining("回复"),
            }),
          }),
        );
      });

      it("should skip reply notification when admin email is disabled", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
              },
            },
          },
        });

        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin root comment",
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "User reply to admin",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(userContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should still emit admin webhook when reply notifications are unsubscribed", async () => {
        await seedSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
              },
            },
            webhook: {
              url: "https://example.com/reply-webhook",
              secret: "secret",
            },
          },
        });
        await EmailData.unsubscribe(
          adminContext.db,
          adminContext.session.user.id,
          "reply_notification",
        );

        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin root comment",
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: "User reply to unsubscribed admin",
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              url: "https://example.com/reply-webhook",
              event: expect.objectContaining({
                type: "comment.reply_to_admin_published",
                data: expect.objectContaining({
                  postTitle: "Test Post",
                  replierName: "Test User",
                  replyPreview: "User reply to unsubscribed admin",
                }),
              }),
            }),
          }),
        );
      });
    });

    describe("Handled Comments", () => {
      const handledAtOf = async (id: number) =>
        (await CommentRepo.findCommentById(adminContext.db, id))?.handledAt ??
        null;

      it("marks a comment handled and unmarks it", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "谢谢up主",
          }),
        );
        expect(await handledAtOf(comment.id)).toBeNull();

        expect(
          unwrap(
            await CommentService.markCommentHandled(adminContext, {
              id: comment.id,
            }),
          ),
        ).toEqual({ success: true });
        expect(await handledAtOf(comment.id)).toBeInstanceOf(Date);

        unwrap(
          await CommentService.unmarkCommentHandled(adminContext, {
            id: comment.id,
          }),
        );
        expect(await handledAtOf(comment.id)).toBeNull();
      });

      it("keeps updatedAt when marking a comment handled", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Unchanged",
          }),
        );
        await adminContext.db
          .update(CommentsTable)
          .set({ updatedAt: new Date(1_000_000_000_000) })
          .where(eq(CommentsTable.id, comment.id));

        unwrap(
          await CommentService.markCommentHandled(adminContext, {
            id: comment.id,
          }),
        );

        const after = await CommentRepo.findCommentById(
          adminContext.db,
          comment.id,
        );
        expect(after?.handledAt).toBeInstanceOf(Date);
        expect(after?.updatedAt).toEqual(new Date(1_000_000_000_000));
      });

      it("reports a missing comment", async () => {
        const marked = await CommentService.markCommentHandled(adminContext, {
          id: 999_999,
        });
        expect(marked.error?.reason).toBe("COMMENT_NOT_FOUND");
        const unmarked = await CommentService.unmarkCommentHandled(
          adminContext,
          { id: 999_999 },
        );
        expect(unmarked.error?.reason).toBe("COMMENT_NOT_FOUND");
      });

      it("marks the comment an Admin replies to handled, and keeps it after the reply is deleted", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Question",
          }),
        );
        const followUp = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Follow-up",
            rootId: root.id,
            replyToCommentId: root.id,
          }),
        );

        const reply = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Answer",
            rootId: root.id,
            replyToCommentId: followUp.id,
          }),
        );

        expect(await handledAtOf(followUp.id)).toBeInstanceOf(Date);
        expect(await handledAtOf(root.id)).toBeNull();

        unwrap(
          await CommentService.deleteComment(adminContext, { id: reply.id }),
        );
        expect(await handledAtOf(followUp.id)).toBeInstanceOf(Date);
      });

      it("does not mark the parent handled when a visitor replies", async () => {
        const root = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Root",
          }),
        );
        unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Me too",
            rootId: root.id,
          }),
        );
        expect(await handledAtOf(root.id)).toBeNull();
      });

      it("marks every unreplied comment handled and returns the count", async () => {
        const first = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "First",
          }),
        );
        const second = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Second",
          }),
        );
        const alreadyHandled = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Handled before",
          }),
        );
        unwrap(
          await CommentService.markCommentHandled(adminContext, {
            id: alreadyHandled.id,
          }),
        );
        const adminComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: "Admin note",
          }),
        );

        expect(
          await CommentService.markAllUnrepliedCommentsHandled(adminContext),
        ).toEqual({ count: 2 });
        expect(await handledAtOf(first.id)).toBeInstanceOf(Date);
        expect(await handledAtOf(second.id)).toBeInstanceOf(Date);
        expect(await handledAtOf(adminComment.id)).toBeNull();

        expect(
          await CommentService.markAllUnrepliedCommentsHandled(adminContext),
        ).toEqual({ count: 0 });
      });

      it("keeps handledAt out of public comment responses", async () => {
        const created = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: "Public",
          }),
        );
        expect(created).not.toHaveProperty("handledAt");
        unwrap(
          await CommentService.markCommentHandled(adminContext, {
            id: created.id,
          }),
        );

        const roots = await CommentService.getRootComments(userContext, {
          postId,
        });
        expect(roots.items[0]).not.toHaveProperty("handledAt");
        expect(
          GetRootCommentsResponseSchema.parse(roots).items[0],
        ).not.toHaveProperty("handledAt");

        const mine = await CommentService.getMyComments(userContext, {});
        expect(z.array(CommentSelectSchema).parse(mine)[0]).not.toHaveProperty(
          "handledAt",
        );
      });
    });
  });
});
