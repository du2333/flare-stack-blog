/**
 * What a Comment belongs to: exactly one Post or one Moment (ADR 0037). The
 * database holds every row to one of them (`comments_one_target`).
 */
export type CommentTarget =
  | { type: "post"; id: number }
  | { type: "moment"; id: number };

/**
 * The target a row or a checked input names. Input schemas require exactly
 * one of the two ids, so a value without `momentId` names its Post.
 */
export function commentTargetOf(value: {
  postId?: number | null;
  momentId?: number | null;
}): CommentTarget {
  if (value.momentId != null) return { type: "moment", id: value.momentId };
  if (value.postId != null) return { type: "post", id: value.postId };
  throw new Error("A Comment needs a Post or a Moment");
}
