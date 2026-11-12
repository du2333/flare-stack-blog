import { blogConfig } from "@/blog.config";
import { jsonCommentToPlainText } from "@/features/comments/comment-body";
import type { SystemConfig } from "@/features/config/config.schema";
import { isEmailConfigured } from "@/features/email/service/email.service";
import { DASHBOARD_WRITING_WEEKS } from "@/features/dashboard/writing-calendar";

export const DASHBOARD_RECENT_POSTS_LIMIT = 8;
export const DASHBOARD_PENDING_FRIEND_LINKS_LIMIT = 5;
export const DASHBOARD_UNREPLIED_COMMENTS_LIMIT = 5;
export const DASHBOARD_TOP_POSTS_LIMIT = 5;
/** Snapshot entries looked up per load; covers Posts unpublished since the sync. */
export const DASHBOARD_TOP_POST_CANDIDATES = 25;
export const DASHBOARD_RECENT_COMMENT_DAYS = 7;
/** Every day the calendar can show, plus one for any time zone's offset. */
export const DASHBOARD_WRITING_LOOKBACK_DAYS = DASHBOARD_WRITING_WEEKS * 7 + 1;
const DASHBOARD_COMMENT_SNIPPET_LENGTH = 80;

export type PopularityAlert = "failed" | "expired";
export type PopularityState = "unconfigured" | "missing" | "expired" | "ready";

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

export function adminEmailNeedsSetup(config: SystemConfig): boolean {
  const adminEmailEnabled = config.notification?.admin?.channels?.email ?? true;
  if (!adminEmailEnabled) return false;
  return !isEmailConfigured(config.email);
}

export function siteIdentityIsDefault(
  site: SystemConfig["site"] | undefined,
): boolean {
  const title = site?.title?.trim() ?? "";
  const author = site?.author?.trim() ?? "";
  return title === blogConfig.title || author === blogConfig.author;
}

export function commentSnippet(
  content: unknown,
  maxLength = DASHBOARD_COMMENT_SNIPPET_LENGTH,
): string {
  const plain = jsonCommentToPlainText(content).replace(/\s+/g, " ").trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

/**
 * What the dashboard can say about traffic: nothing without Umami or a
 * snapshot; a stale snapshot is still shown, marked expired.
 */
export function popularityState(
  status: { configured: boolean; expired: boolean },
  hasSnapshot: boolean,
): PopularityState {
  if (!status.configured) return "unconfigured";
  if (!hasSnapshot) return "missing";
  if (status.expired) return "expired";
  return "ready";
}

export function totalViews(entries: ReadonlyArray<{ score: number }>): number {
  return entries.reduce((sum, entry) => sum + entry.score, 0);
}

/** Snapshot order, keeping only Posts that are still public. */
export function rankTopPosts<TPost extends { id: number }>(
  entries: ReadonlyArray<{ postId: number; score: number }>,
  publicPosts: ReadonlyArray<TPost>,
  limit = DASHBOARD_TOP_POSTS_LIMIT,
): Array<TPost & { views: number }> {
  const postsById = new Map(publicPosts.map((post) => [post.id, post]));
  const ranked: Array<TPost & { views: number }> = [];
  for (const entry of entries) {
    const post = postsById.get(entry.postId);
    if (!post) continue;
    ranked.push({ ...post, views: entry.score });
    if (ranked.length >= limit) break;
  }
  return ranked;
}
