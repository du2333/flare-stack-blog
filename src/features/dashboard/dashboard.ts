import { jsonCommentToPlainText } from "@/features/comments/comment-body";

export const DASHBOARD_RECENT_POSTS_LIMIT = 3;
export const DASHBOARD_PENDING_FRIEND_LINKS_LIMIT = 5;
export const DASHBOARD_RECENT_COMMENTS_LIMIT = 8;
export const DASHBOARD_COMMENT_SNIPPET_LENGTH = 80;

export type PopularityAlert = "failed" | "expired";

export function popularityAlertFromStatus(status: {
  configured: boolean;
  expired: boolean;
  lastError: string | null;
}): PopularityAlert | null {
  if (!status.configured) return null;
  if (status.lastError) return "failed";
  if (status.expired) return "expired";
  return null;
}

export function commentSnippet(
  content: unknown,
  maxLength = DASHBOARD_COMMENT_SNIPPET_LENGTH,
): string {
  const plain = jsonCommentToPlainText(content).replace(/\s+/g, " ").trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
