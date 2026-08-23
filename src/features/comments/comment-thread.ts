export const COMMENT_REPLY_PREVIEW_LIMIT = 3;
export const COMMENT_PAGE_SIZE = 20;

export function remainingPublishedReplies(
  publishedCount: number,
  visible: Array<{ status: string }>,
): number {
  const visiblePublished = visible.filter(
    (item) => item.status === "published",
  ).length;
  return Math.max(0, publishedCount - visiblePublished);
}
