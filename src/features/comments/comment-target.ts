import type { CreateCommentInput } from "./comments.schema";

/**
 * What a Comment belongs to: exactly one Post or one Moment (ADR 0037). The
 * database holds every row to one of them (`comments_one_target`).
 */
export type CommentTarget =
  | { type: "post"; id: number }
  | { type: "moment"; id: number };

/**
 * The target a row or an input names: a row holds exactly one of the two ids
 * (`comments_one_target`), and an input the one its procedure's path names.
 */
export function commentTargetOf(value: {
  postId?: number | null;
  momentId?: number | null;
}): CommentTarget {
  if (value.momentId != null) return { type: "moment", id: value.momentId };
  if (value.postId != null) return { type: "post", id: value.postId };
  throw new Error("A Comment needs a Post or a Moment");
}

/**
 * The `create` input for a Comment on a target: a Post's names `postId`, a
 * Moment's `momentId`, and the rest is the same.
 */
export function createCommentInput(
  target: CommentTarget,
  fields: { content: string; rootId?: number; replyToCommentId?: number },
): CreateCommentInput {
  return target.type === "moment"
    ? { momentId: target.id, ...fields }
    : { postId: target.id, ...fields };
}
