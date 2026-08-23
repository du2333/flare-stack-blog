export function publicCommentPath(slug: string, commentId: number): string {
  return `/post/${slug}?comment=${commentId}`;
}

export function publicCommentUrl(
  domain: string,
  slug: string,
  commentId: number,
): string {
  return `https://${domain}${publicCommentPath(slug, commentId)}`;
}
