import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import * as AiService from "@/features/ai/ai.service";
import * as CommentService from "@/features/comments/comments.service";
import { CommentModerationWorkflow } from "@/features/comments/workflows/comment-moderation";
import * as WorkflowHelpers from "@/features/comments/workflows/helpers";
import * as PostService from "@/features/posts/posts.service";
import { unwrap } from "@/lib/errors";

describe("CommentModerationWorkflow", () => {
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

  const step: WorkflowStep = {
    do: (async (
      _name: string,
      configOrCallback: unknown,
      maybeCallback?: unknown,
    ) => {
      const callback =
        typeof configOrCallback === "function"
          ? configOrCallback
          : maybeCallback;
      return await (callback as () => Promise<unknown>)();
    }) as WorkflowStep["do"],
    sleep: (async () => undefined) as unknown as WorkflowStep["sleep"],
    sleepUntil: (async () =>
      undefined) as unknown as WorkflowStep["sleepUntil"],
    waitForEvent: (async () =>
      undefined) as unknown as WorkflowStep["waitForEvent"],
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);

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

    const { id } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: {
          title: "上下文测试文章",
          summary: "这是一篇讨论代码审核与评论交流边界的文章摘要。",
          status: "published",
          slug: `workflow-test-${Date.now()}`,
          contentJson: createCommentContent(
            "文章正文详细讨论了如何区分正常反驳、友好调侃、恶意辱骂和广告灌水。",
          ),
        },
      }),
    );
    postId = id;
  });

  it("passes post and reply context to AI moderation", async () => {
    userContext.env.ENVIRONMENT = "prod";

    const root = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: createCommentContent("我觉得文章对误判问题分析得还不够细。"),
      }),
    );

    const reply = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        rootId: root.id,
        replyToCommentId: root.id,
        content: createCommentContent(
          "你这个理解不对，我是说审核要结合上下文看。",
        ),
      }),
    );

    const moderateSpy = vi
      .spyOn(AiService, "moderateComment")
      .mockResolvedValue({ safe: true, reason: "上下文完整，允许通过" });
    vi.spyOn(WorkflowHelpers, "sendReplyNotification").mockResolvedValue();

    await CommentModerationWorkflow.prototype.run.call(
      { env: userContext.env },
      {
        payload: { commentId: reply.id },
      } as WorkflowEvent<{ commentId: number }>,
      step,
    );

    expect(moderateSpy).toHaveBeenCalledWith(
      { env: userContext.env },
      expect.objectContaining({
        comment: "你这个理解不对，我是说审核要结合上下文看。",
        post: expect.objectContaining({
          title: "上下文测试文章",
          summary: "这是一篇讨论代码审核与评论交流边界的文章摘要。",
          contentPreview:
            expect.stringContaining("文章正文详细讨论了如何区分正常反驳"),
        }),
        thread: {
          isReply: true,
          rootComment: "我觉得文章对误判问题分析得还不够细。",
          replyToComment: "我觉得文章对误判问题分析得还不够细。",
        },
      }),
    );
  });
});
