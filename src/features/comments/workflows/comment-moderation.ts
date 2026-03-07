import { WorkflowEntrypoint } from "cloudflare:workers";
import { renderToStaticMarkup } from "react-dom/server";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import * as CommentService from "@/features/comments/comments.service";
import * as AiService from "@/features/ai/ai.service";
import * as CommentRepo from "@/features/comments/data/comments.data";
import * as PostService from "@/features/posts/posts.service";
import { sendReplyNotification } from "@/features/comments/workflows/helpers";
import { AdminNotificationEmail } from "@/features/email/templates/AdminNotificationEmail";
import { getDb } from "@/lib/db";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";
import {
  buildContentPreview,
  convertToPlainText,
} from "@/features/posts/utils/content";

interface Params {
  commentId: number;
}

export class CommentModerationWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { commentId } = event.payload;

    // Step 1: Fetch the comment
    const comment = await step.do("fetch comment", async () => {
      const db = getDb(this.env);
      return await CommentService.findCommentById(
        { db, env: this.env },
        commentId,
      );
    });

    if (!comment) {
      console.log(
        JSON.stringify({
          message: "comment not found, skipping moderation",
          commentId,
        }),
      );
      return;
    }

    // Skip if comment is already processed or deleted
    if (comment.status !== "verifying") {
      console.log(
        JSON.stringify({
          message: "comment already processed, skipping moderation",
          commentId,
          status: comment.status,
        }),
      );
      return;
    }

    const post = await step.do("fetch post", async () => {
      const db = getDb(this.env);
      return await PostService.findPostById(
        { db, env: this.env },
        { id: comment.postId },
      );
    });

    if (!post) {
      console.log(
        JSON.stringify({
          message: "post not found, skipping moderation",
          postId: comment.postId,
        }),
      );
      return;
    }

    const threadContext = await step.do("fetch thread context", async () => {
      const db = getDb(this.env);
      const [rootComment, replyToComment] = await Promise.all([
        comment.rootId
          ? CommentService.findCommentById(
              { db, env: this.env },
              comment.rootId,
            )
          : null,
        comment.replyToCommentId
          ? CommentService.findCommentById(
              { db, env: this.env },
              comment.replyToCommentId,
            )
          : null,
      ]);

      return {
        rootCommentText: rootComment
          ? convertToPlainText(rootComment.content).trim()
          : "",
        replyToCommentText: replyToComment
          ? convertToPlainText(replyToComment.content).trim()
          : "",
      };
    });

    // Extract plain text from JSONContent
    const plainText = convertToPlainText(comment.content);
    const postContentPreview = buildContentPreview(post.contentJson);

    if (!plainText || plainText.trim().length === 0) {
      // Empty comment, mark as pending for manual review
      await step.do("mark empty comment as pending", async () => {
        const db = getDb(this.env);
        await CommentService.updateCommentStatus(
          { db, env: this.env },
          commentId,
          "pending",
          "评论内容为空，需人工审核",
        );
      });
      return;
    }

    // Step 2: Call AI to moderate the content
    const moderationResult = await step.do(
      `moderate comment ${commentId}`,
      {
        retries: {
          limit: 3,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        if (isNotInProduction(this.env)) {
          return {
            safe: true,
            reason: "开发环境，自动通过",
          };
        }
        try {
          return await AiService.moderateComment(
            { env: this.env },
            {
              comment: plainText,
              post: {
                title: post.title,
                summary: post.summary ?? "",
                contentPreview: postContentPreview,
              },
              thread: {
                isReply: Boolean(comment.replyToCommentId),
                rootComment: threadContext.rootCommentText,
                replyToComment: threadContext.replyToCommentText,
              },
            },
          );
        } catch (error) {
          // If AI service is not configured, mark as pending for manual review
          console.error(
            JSON.stringify({
              message: "ai moderation failed",
              commentId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return {
            safe: false,
            reason: "AI 审核服务暂时不可用，等待人工审核",
          };
        }
      },
    );

    // Step 3: Update comment status based on moderation result
    await step.do("update comment status", async () => {
      const db = getDb(this.env);

      if (moderationResult.safe) {
        await CommentService.updateCommentStatus(
          { db, env: this.env },
          commentId,
          "published",
          moderationResult.reason,
        );
      } else {
        await CommentService.updateCommentStatus(
          { db, env: this.env },
          commentId,
          "pending",
          moderationResult.reason,
        );
      }
    });

    // Step 3.5: Notify admin when comment is flagged for review
    if (!moderationResult.safe) {
      await step.do("notify admin pending comment", async () => {
        const db = getDb(this.env);
        const commenter = await CommentRepo.getCommentAuthorWithEmail(
          db,
          comment.id,
        );
        const { ADMIN_EMAIL, DOMAIN } = serverEnv(this.env);
        const commentPreview = plainText.slice(0, 100);

        const emailHtml = renderToStaticMarkup(
          AdminNotificationEmail({
            postTitle: post.title,
            commenterName: commenter?.name ?? "匿名用户",
            commentPreview: `${commentPreview}${commentPreview.length >= 100 ? "..." : ""}`,
            commentUrl: `https://${DOMAIN}/admin/comments`,
          }),
        );

        await this.env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: ADMIN_EMAIL,
            subject: `[待审核] ${post.title}`,
            html: emailHtml,
          },
        });
      });
    }

    // Step 4: Send reply notification if comment was approved and is a reply
    if (moderationResult.safe && comment.replyToCommentId) {
      await step.do("send reply notification", async () => {
        const db = getDb(this.env);
        await sendReplyNotification(db, this.env, {
          comment: {
            id: comment.id,
            rootId: comment.rootId,
            replyToCommentId: comment.replyToCommentId,
            userId: comment.userId,
            content: comment.content,
          },
          post: { slug: post.slug, title: post.title },
        });
      });
    }
  }
}
