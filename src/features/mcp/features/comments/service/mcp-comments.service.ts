import type { JSONContent } from "@tiptap/core";
import * as CommentService from "@/features/comments/comments.service";
import { convertToPlainText } from "@/features/posts/utils/content";
import { serializeMcpDate } from "../../../service/mcp-serialize";

function toCommentText(content: JSONContent | null) {
  return convertToPlainText(content).trim();
}

export async function listMcpComments(
  context: DbContext,
  input: {
    offset?: number;
    limit?: number;
    status?: "pending" | "published" | "deleted" | "verifying";
    postId?: number;
    userName?: string;
  },
) {
  const response = await CommentService.getAllComments(context, input);

  const relatedCommentIds = [
    ...new Set(
      response.items.flatMap((comment) =>
        [comment.rootId, comment.replyToCommentId].filter(
          (value): value is number => value !== null,
        ),
      ),
    ),
  ];

  const relatedComments = await Promise.all(
    relatedCommentIds.map(
      async (id) =>
        [id, await CommentService.findCommentById(context, id)] as const,
    ),
  );

  const relatedCommentTextById = new Map(
    relatedComments.flatMap(([id, comment]) =>
      comment ? [[id, toCommentText(comment.content)]] : [],
    ),
  );

  return {
    items: response.items.map((comment) => ({
      id: comment.id,
      status: comment.status,
      contentText: toCommentText(comment.content),
      aiReason: comment.aiReason,
      createdAt: serializeMcpDate(comment.createdAt),
      updatedAt: serializeMcpDate(comment.updatedAt),
      postId: comment.postId,
      postTitle: comment.post?.title ?? null,
      postSlug: comment.post?.slug ?? null,
      authorId: comment.user?.id ?? null,
      authorName: comment.user?.name ?? null,
      authorRole: comment.user?.role ?? null,
      rootId: comment.rootId,
      replyToCommentId: comment.replyToCommentId,
      replyToUserName: comment.replyToUser?.name ?? null,
      rootCommentText:
        comment.rootId !== null
          ? (relatedCommentTextById.get(comment.rootId) ?? null)
          : null,
      replyToCommentText:
        comment.replyToCommentId !== null
          ? (relatedCommentTextById.get(comment.replyToCommentId) ?? null)
          : null,
    })),
    total: response.total,
  };
}
