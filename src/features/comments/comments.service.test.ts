import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import * as CommentService from "@/features/comments/comments.service";
import * as PostService from "@/features/posts/posts.service";
import { unwrap } from "@/lib/error";

describe("CommentService", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;
  let postId: number;

  // 通用评论内容
  const createCommentContent = (text: string) => ({
    type: "doc" as const,
    content: [
      {
        type: "paragraph" as const,
        content: [{ type: "text" as const, text }],
      },
    ],
  });

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

    // Create a published post for comments
    const { id } = await PostService.createEmptyPost(adminContext);
    await PostService.updatePost(adminContext, {
      id,
      data: {
        title: "Test Post",
        status: "published",
        slug: `test-post-${Date.now()}`,
      },
    });
    postId = id;
  });

  describe("Comment Creation", () => {
    it("should create a comment with verifying status", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Great post!"),
        }),
      );

      expect(comment.status).toBe("verifying");
      expect(comment.userId).toBe("user-1");
      expect(comment.postId).toBe(postId);
    });

    it("should trigger moderation workflow on creation", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Nice article!"),
        }),
      );

      expect(
        userContext.env.COMMENT_MODERATION_WORKFLOW.create,
      ).toHaveBeenCalledWith({
        params: { commentId: comment.id },
      });
    });

    it("should create a reply to an existing comment", async () => {
      const parent = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Parent comment"),
        }),
      );

      const reply = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Reply to parent"),
          rootId: parent.id,
        }),
      );

      expect(reply.rootId).toBe(parent.id);
      expect(reply.replyToCommentId).toBe(parent.id);
    });
  });

  describe("Comment Moderation", () => {
    it("should allow admin to publish a comment", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Awaiting moderation"),
        }),
      );

      const moderatedComment = await CommentService.moderateComment(
        adminContext,
        {
          id: comment.id,
          status: "published",
        },
      );

      expect(moderatedComment.status).toBe("published");
    });

    it("should allow admin to mark a comment as pending", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Needs review"),
        }),
      );

      // First publish the comment
      await CommentService.moderateComment(adminContext, {
        id: comment.id,
        status: "published",
      });

      // Then mark as pending for re-review
      const pendingComment = await CommentService.moderateComment(
        adminContext,
        {
          id: comment.id,
          status: "pending",
        },
      );

      expect(pendingComment.status).toBe("pending");
    });
  });

  describe("Comment Deletion", () => {
    it("should allow user to soft delete their own comment", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("My comment"),
        }),
      );

      await CommentService.deleteComment(userContext, {
        id: comment.id,
      });

      const deletedComment = await CommentService.findCommentById(
        userContext,
        comment.id,
      );
      expect(deletedComment?.status).toBe("deleted");
    });

    it("should prevent user from deleting another user's comment", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User 1's comment"),
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

      await expect(
        CommentService.deleteComment(otherUserContext, {
          id: comment.id,
        }),
      ).rejects.toThrow("PERMISSION_DENIED");
    });

    it("should allow admin to hard delete any comment", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("To be hard deleted"),
        }),
      );

      await CommentService.adminDeleteComment(adminContext, {
        id: comment.id,
      });

      const hardDeletedComment = await CommentService.findCommentById(
        adminContext,
        comment.id,
      );
      expect(hardDeletedComment).toBeFalsy();
    });
  });

  describe("Public Comment Queries", () => {
    it("should get root comments by post ID with reply counts", async () => {
      const root = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Root comment"),
        }),
      );

      await CommentService.moderateComment(adminContext, {
        id: root.id,
        status: "published",
      });

      const reply = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Reply"),
          rootId: root.id,
        }),
      );
      await CommentService.moderateComment(adminContext, {
        id: reply.id,
        status: "published",
      });

      const result = await CommentService.getRootCommentsByPostId(userContext, {
        postId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(root.id);
      expect(result.items[0].replyCount).toBe(1);
      expect(result.total).toBe(1);
    });

    it("should get replies by root ID with pagination", async () => {
      const root = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Root"),
        }),
      );
      await CommentService.moderateComment(adminContext, {
        id: root.id,
        status: "published",
      });

      // Create 3 replies
      for (let i = 1; i <= 3; i++) {
        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent(`Reply ${i}`),
            rootId: root.id,
          }),
        );
        await CommentService.moderateComment(adminContext, {
          id: reply.id,
          status: "published",
        });
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

    it("should include viewer's pending comments when viewerId provided", async () => {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("My pending comment"),
        }),
      );

      // Without viewerId - should not see verifying comments
      const resultWithoutViewer = await CommentService.getRootCommentsByPostId(
        adminContext,
        { postId },
      );
      const foundWithoutViewer = resultWithoutViewer.items.find(
        (c) => c.id === comment.id,
      );
      expect(foundWithoutViewer).toBeUndefined();

      // With viewerId - should see own verifying comments
      const resultWithViewer = await CommentService.getRootCommentsByPostId(
        userContext,
        { postId, viewerId: "user-1" },
      );
      const foundWithViewer = resultWithViewer.items.find(
        (c) => c.id === comment.id,
      );
      expect(foundWithViewer).toBeDefined();
    });
  });

  describe("Comment Validation - Edge Cases", () => {
    it("should return ROOT_COMMENT_NOT_FOUND when replying to non-existent root", async () => {
      const result = await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Reply to nothing"),
        rootId: 999999,
      });

      expect(result.error?.reason).toBe("ROOT_COMMENT_NOT_FOUND");
    });

    it("should return INVALID_ROOT_ID when rootId is itself a reply", async () => {
      const root = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Root"),
        }),
      );

      const reply = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Reply"),
          rootId: root.id,
        }),
      );

      // Try to use the reply as a root (should fail)
      const result = await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Nested reply"),
        rootId: reply.id,
      });

      expect(result.error?.reason).toBe("INVALID_ROOT_ID");
    });

    it("should return ROOT_COMMENT_POST_MISMATCH when root belongs to different post", async () => {
      // Create another post
      const { id: otherPostId } =
        await PostService.createEmptyPost(adminContext);
      await PostService.updatePost(adminContext, {
        id: otherPostId,
        data: {
          title: "Other Post",
          status: "published",
          slug: `other-post-${Date.now()}`,
        },
      });

      const otherPostComment = unwrap(
        await CommentService.createComment(userContext, {
          postId: otherPostId,
          content: createCommentContent("Comment on other post"),
        }),
      );

      // Try to reply to it from a different post
      const result = await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Cross-post reply"),
        rootId: otherPostComment.id,
      });

      expect(result.error?.reason).toBe("ROOT_COMMENT_POST_MISMATCH");
    });

    it("should return REPLY_TO_COMMENT_NOT_FOUND when replyToCommentId invalid", async () => {
      const root = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Root"),
        }),
      );

      const result = await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Reply to invalid"),
        rootId: root.id,
        replyToCommentId: 999999,
      });

      expect(result.error?.reason).toBe("REPLY_TO_COMMENT_NOT_FOUND");
    });

    it("should return ROOT_COMMENT_CANNOT_HAVE_REPLY_TO when creating root with replyToCommentId", async () => {
      const existing = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Existing"),
        }),
      );

      // Try to create a root comment (no rootId) but with replyToCommentId
      const result = await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Invalid root"),
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
          content: createCommentContent("Admin comment"),
        }),
      );

      expect(comment.status).toBe("published");

      // Moderation workflow should NOT be triggered for admin
      expect(
        adminContext.env.COMMENT_MODERATION_WORKFLOW.create,
      ).not.toHaveBeenCalled();
    });

    it("should enqueue admin notification email on new root comment", async () => {
      await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("New root comment for notification"),
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

    it("should enqueue reply notification email when admin replies to a user comment", async () => {
      const rootComment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User's comment"),
        }),
      );
      await CommentService.moderateComment(adminContext, {
        id: rootComment.id,
        status: "published",
      });

      // Clear mocks to isolate the admin reply notification
      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      // Admin replies to the user's comment
      await CommentService.createComment(adminContext, {
        postId,
        content: createCommentContent("Admin reply"),
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

    it("should not trigger reply notification when admin replies to own comment", async () => {
      const rootComment = unwrap(
        await CommentService.createComment(adminContext, {
          postId,
          content: createCommentContent("Admin's root comment"),
        }),
      );

      // Clear mocks
      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      // Admin replies to own comment
      await CommentService.createComment(adminContext, {
        postId,
        content: createCommentContent("Admin self-reply"),
        rootId: rootComment.id,
        replyToCommentId: rootComment.id,
      });

      // No notification should be sent (self-reply)
      expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
    });

    it("should trigger reply notification when manually approving a reply comment", async () => {
      const rootComment = unwrap(
        await CommentService.createComment(adminContext, {
          postId,
          content: createCommentContent("Admin's root comment"),
        }),
      );

      // User creates a reply (goes to verifying status)
      const reply = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User reply to admin"),
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        }),
      );

      // Clear mocks to isolate the moderation notification
      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      // Admin manually approves the reply
      await CommentService.moderateComment(adminContext, {
        id: reply.id,
        status: "published",
      });

      // Reply notification should have been sent to the admin (reply-to author)
      expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EMAIL",
          data: expect.objectContaining({
            to: "admin@example.com",
            subject: expect.stringContaining("回复"),
          }),
        }),
      );
    });

    it("should get all comments with admin filters", async () => {
      const comment1 = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Pending comment"),
        }),
      );
      await CommentService.moderateComment(adminContext, {
        id: comment1.id,
        status: "pending",
      });

      const comment2 = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Published comment"),
        }),
      );
      await CommentService.moderateComment(adminContext, {
        id: comment2.id,
        status: "published",
      });

      // Filter by status
      const pendingOnly = await CommentService.getAllComments(adminContext, {
        status: "pending",
      });
      expect(pendingOnly.items.every((c) => c.status === "pending")).toBe(true);

      // Filter by postId
      const byPost = await CommentService.getAllComments(adminContext, {
        postId,
      });
      expect(byPost.items.every((c) => c.postId === postId)).toBe(true);
    });

    it("should get user comment stats", async () => {
      const comment1 = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Comment 1"),
        }),
      );
      await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("Comment 2"),
      });

      // Delete one
      await CommentService.deleteComment(userContext, {
        id: comment1.id,
      });

      const stats = await CommentService.getUserCommentStats(
        adminContext,
        "user-1",
      );

      expect(stats.totalComments).toBe(2);
      expect(stats.rejectedComments).toBe(1); // deleted counts as rejected
      expect(stats.registeredAt).toBeDefined();
    });
  });
});
