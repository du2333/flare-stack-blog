import { resolveSystemConfig } from "@/features/config/config.resolve";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import {
  adminEmailNeedsSetup,
  commentSnippet,
  DASHBOARD_PENDING_FRIEND_LINKS_LIMIT,
  DASHBOARD_RECENT_COMMENTS_LIMIT,
  DASHBOARD_RECENT_POSTS_LIMIT,
  popularityAlertFromStatus,
  siteIdentityIsDefault,
} from "@/features/dashboard/dashboard";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import * as FriendLinkRepo from "@/features/friend-links/data/friend-links.data";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";

export async function getDashboardOverview(
  context: DbContext,
): Promise<DashboardOverview> {
  const { db } = context;

  const [
    popularityStatus,
    recentPosts,
    pendingItems,
    pendingTotal,
    comments,
    storedConfig,
  ] = await Promise.all([
    postPopularityService.getStatus(context),
    DashboardRepo.listRecentPosts(db, DASHBOARD_RECENT_POSTS_LIMIT),
    FriendLinkRepo.getAllFriendLinks(db, {
      status: "pending",
      limit: DASHBOARD_PENDING_FRIEND_LINKS_LIMIT,
    }),
    FriendLinkRepo.getAllFriendLinksCount(db, { status: "pending" }),
    DashboardRepo.listRecentVisitorComments(
      db,
      DASHBOARD_RECENT_COMMENTS_LIMIT,
    ),
    ConfigRepo.getSystemConfig(db),
  ]);
  const config = resolveSystemConfig(storedConfig);

  return {
    popularityAlert: popularityAlertFromStatus(popularityStatus),
    adminEmailNeedsSetup: adminEmailNeedsSetup(config),
    defaultSiteIdentity: siteIdentityIsDefault(config.site),
    recentPosts,
    pendingFriendLinks: {
      items: pendingItems.map((item) => ({
        id: item.id,
        siteName: item.siteName,
        siteUrl: item.siteUrl,
        createdAt: item.createdAt,
      })),
      remainingCount: Math.max(0, pendingTotal - pendingItems.length),
    },
    recentComments: comments.flatMap((comment) => {
      if (!comment.postSlug) return [];
      return [
        {
          id: comment.id,
          userName: comment.userName,
          postTitle: comment.postTitle,
          postSlug: comment.postSlug,
          snippet: commentSnippet(comment.content),
          createdAt: comment.createdAt,
        },
      ];
    }),
  };
}
