import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CommentService from "@/features/comments/comments.service";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as ConfigService from "@/features/config/service/config.service";
import * as EmailData from "@/features/email/data/email.data";
import * as PostService from "@/features/posts/services/posts.service";
import { CommentsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

describe("Comments Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;
  let postId: number;

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
      postId = id;

      await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
    });

    describe("Comment Creation", () => {
      it("should create a published comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent("Great post!"),
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

        const result = await CommentService.deleteComment(otherUserContext, {
          id: comment.id,
        });
        expect(result.error?.reason).toBe("PERMISSION_DENIED");
      });

      it("should allow admin to soft delete any comment", async () => {
        const comment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent("To be deleted by admin"),
          }),
        );

        unwrap(
          await CommentService.deleteComment(adminContext, {
            id: comment.id,
          }),
        );

        const result = await CommentService.getRootCommentsByPostId(
          userContext,
          { postId },
        );
        expect(
          result.items.find((item) => item.id === comment.id)?.status,
        ).toBe("deleted");
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

        const reply = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent("Reply"),
            rootId: root.id,
          }),
        );
        expect(reply.status).toBe("published");

        const result = await CommentService.getRootCommentsByPostId(
          userContext,
          {
            postId,
          },
        );

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

        // Create 3 replies
        for (let i = 1; i <= 3; i++) {
          unwrap(
            await CommentService.createComment(userContext, {
              postId,
              content: createCommentContent(`Reply ${i}`),
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
            content: createCommentContent("Public comment"),
          }),
        );

        const result = await CommentService.getRootCommentsByPostId(
          adminContext,
          { postId },
        );
        expect(result.items.find((c) => c.id === comment.id)).toBeDefined();
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
        unwrap(
          await PostService.updatePost(adminContext, {
            id: otherPostId,
            data: {
              title: "Other Post",
              slug: `other-post-${Date.now()}`,
            },
          }),
        );

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

      it("should enqueue both email and webhook when both channels are enabled", async () => {
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: true,
                webhook: true,
              },
            },
            webhooks: [
              {
                id: "dual-channel-endpoint",
                name: "Dual Channel Endpoint",
                url: "https://example.com/webhook",
                enabled: true,
                secret: "secret",
                events: ["comment.admin_root_created"],
              },
            ],
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Dual channel comment"),
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
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: true,
              },
            },
            webhooks: [
              {
                id: "admin-webhook",
                name: "Admin Webhook",
                url: "https://example.com/webhook",
                enabled: true,
                secret: "secret",
                events: ["comment.admin_root_created"],
              },
            ],
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Webhook only notification"),
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              endpointId: "admin-webhook",
              url: "https://example.com/webhook",
              event: expect.objectContaining({
                type: "comment.admin_root_created",
              }),
            }),
          }),
        );
      });

      it("should only enqueue webhook for endpoints subscribed to the event", async () => {
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: true,
              },
            },
            webhooks: [
              {
                id: "matched-endpoint",
                name: "Matched Endpoint",
                url: "https://example.com/matched",
                enabled: true,
                secret: "secret-1",
                events: ["comment.admin_root_created"],
              },
              {
                id: "unmatched-endpoint",
                name: "Unmatched Endpoint",
                url: "https://example.com/unmatched",
                enabled: true,
                secret: "secret-2",
                events: ["friend_link.submitted"],
              },
            ],
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Only matched webhook should receive"),
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              endpointId: "matched-endpoint",
              url: "https://example.com/matched",
              event: expect.objectContaining({
                type: "comment.admin_root_created",
              }),
            }),
          }),
        );
      });

      it("should not enqueue webhook for disabled endpoints", async () => {
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: true,
              },
            },
            webhooks: [
              {
                id: "disabled-endpoint",
                name: "Disabled Endpoint",
                url: "https://example.com/disabled",
                enabled: false,
                secret: "secret",
                events: ["comment.admin_root_created"],
              },
            ],
          },
        });

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("Comment with disabled webhook"),
        });

        expect(userContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should enqueue reply notification email when admin replies to a user comment", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent("User's comment"),
          }),
        );

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

      it("should skip user reply notification when user email notifications are disabled", async () => {
        await ConfigService.updateSystemConfig(adminContext, {
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
            content: createCommentContent("User comment"),
          }),
        );

        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(adminContext, {
          postId,
          content: createCommentContent("Admin reply"),
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should skip reply notification when the replied user's account was deleted", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(userContext, {
            postId,
            content: createCommentContent("User comment from deleted account"),
          }),
        );

        await adminContext.db
          .update(CommentsTable)
          .set({ userId: null })
          .where(eq(CommentsTable.id, rootComment.id));

        vi.mocked(adminContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(adminContext, {
          postId,
          content: createCommentContent("Admin reply after account deletion"),
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
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

      it("should enqueue a reply notification when a user replies to an admin", async () => {
        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: createCommentContent("Admin's root comment"),
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User reply to admin"),
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
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: false,
              },
            },
          },
        });

        const rootComment = unwrap(
          await CommentService.createComment(adminContext, {
            postId,
            content: createCommentContent("Admin root comment"),
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User reply to admin"),
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(userContext.env.QUEUE.send).not.toHaveBeenCalled();
      });

      it("should still emit admin webhook when reply notifications are unsubscribed", async () => {
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          notification: {
            ...DEFAULT_CONFIG.notification,
            admin: {
              channels: {
                email: false,
                webhook: true,
              },
            },
            webhooks: [
              {
                id: "admin-reply-webhook",
                name: "Admin Reply Webhook",
                enabled: true,
                url: "https://example.com/reply-webhook",
                secret: "secret",
                events: ["comment.reply_to_admin_published"],
              },
            ],
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
            content: createCommentContent("Admin root comment"),
          }),
        );

        vi.mocked(userContext.env.QUEUE.send).mockClear();

        await CommentService.createComment(userContext, {
          postId,
          content: createCommentContent("User reply to unsubscribed admin"),
          rootId: rootComment.id,
          replyToCommentId: rootComment.id,
        });

        expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
        expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "WEBHOOK",
            data: expect.objectContaining({
              endpointId: "admin-reply-webhook",
              url: "https://example.com/reply-webhook",
              event: expect.objectContaining({
                type: "comment.reply_to_admin_published",
                data: expect.objectContaining({
                  to: "admin@example.com",
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
  });
});
