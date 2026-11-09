/**
 * The public page a Comment is read on: its Post's, by public slug, or its
 * Moment's, by id (ADR 0037).
 */
export type CommentPage =
  | { type: "post"; slug: string }
  | { type: "moment"; id: number };

/** A Comment's public link (ADR 0015): its page, with its id as the only search param. */
export function publicCommentPath(
  page: CommentPage,
  commentId: number,
): string {
  const path =
    page.type === "post" ? `/post/${page.slug}` : `/moments/${page.id}`;
  return `${path}?comment=${commentId}`;
}

export function publicCommentUrl(
  domain: string,
  page: CommentPage,
  commentId: number,
): string {
  return `https://${domain}${publicCommentPath(page, commentId)}`;
}
