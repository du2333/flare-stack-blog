import { publicCommentPath } from "@/features/comments/comment-url";
import { resolveSystemConfig } from "@/features/config/config.resolve";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import {
  adminEmailNeedsSetup,
  commentSnippet,
  DASHBOARD_PENDING_FRIEND_LINKS_LIMIT,
  DASHBOARD_RECENT_COMMENT_DAYS,
  DASHBOARD_RECENT_POSTS_LIMIT,
  DASHBOARD_TOP_POST_CANDIDATES,
  DASHBOARD_UNREPLIED_COMMENTS_LIMIT,
  DASHBOARD_WRITING_LOOKBACK_DAYS,
  popularityAlertFromStatus,
  popularityState,
  rankTopPosts,
  siteIdentityIsDefault,
  totalViews,
} from "@/features/dashboard/dashboard";
import type {
  DashboardComment,
  DashboardOverview,
  UnrepliedCommentsInput,
} from "@/features/dashboard/dashboard.schema";
import * as FriendLinkRepo from "@/features/friend-links/data/friend-links.data";
import { momentHeading } from "@/features/moments/utils/moment-heading";
import { isMuted } from "@/features/muted-users/muted-users";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as UnpublishedChangesService from "@/features/posts/services/unpublished-changes.service";
import { versionChecker } from "@/features/version/service/version.service";

const DAY_MS = 24 * 60 * 60 * 1000;

async function getPopularity(context: DbContext) {
  const { status, snapshot } =
    await postPopularityService.getStatusWithSnapshot(context);
  const state = popularityState(status, snapshot !== null);
  if (state === "unconfigured" || state === "missing" || !snapshot) {
    return {
      alert: popularityAlertFromStatus(status),
      popularity: {
        state,
        windowStart: null,
        windowEnd: null,
        totalViews: 0,
        topPosts: [],
      },
    };
  }

  const candidates = snapshot.entries.slice(0, DASHBOARD_TOP_POST_CANDIDATES);
  const publicPosts = await DashboardRepo.listPublicPostsByIds(
    context.db,
    candidates.map((entry) => entry.postId),
  );
  return {
    alert: popularityAlertFromStatus(status),
    popularity: {
      state,
      windowStart: snapshot.windowStart,
      windowEnd: snapshot.windowEnd,
      totalViews: totalViews(snapshot.entries),
      topPosts: rankTopPosts(candidates, publicPosts),
    },
  };
}

export async function getDashboardOverview(
  context: DbContext,
): Promise<DashboardOverview> {
  const { db } = context;
  const now = Date.now();
  const recentCommentsSince = new Date(
    now - DASHBOARD_RECENT_COMMENT_DAYS * DAY_MS,
  );
  const writingSince = new Date(now - DASHBOARD_WRITING_LOOKBACK_DAYS * DAY_MS);
  // Recent posts compare fingerprints in SQL, so migrated Posts need theirs.
  await UnpublishedChangesService.settleFingerprints(db);

  const [
    { alert, popularity },
    cachedUpdate,
    postCounts,
    commentCounts,
    friendLinkCounts,
    latestDraft,
    recentPosts,
    pendingItems,
    unrepliedItems,
    unrepliedTotal,
    storedConfig,
    writingActivity,
  ] = await Promise.all([
    getPopularity(context),
    versionChecker.cached(context),
    PostRepo.getAdminPostStatusCounts(db),
    DashboardRepo.countPublicComments(db, recentCommentsSince),
    FriendLinkRepo.getFriendLinkStatusCounts(db),
    DashboardRepo.findLatestDraft(db),
    // One extra so the list stays full after leaving out the latest draft.
    DashboardRepo.listRecentPosts(db, DASHBOARD_RECENT_POSTS_LIMIT + 1),
    FriendLinkRepo.getAllFriendLinks(db, {
      status: "pending",
      limit: DASHBOARD_PENDING_FRIEND_LINKS_LIMIT,
    }),
    DashboardRepo.listUnrepliedComments(db, {
      limit: DASHBOARD_UNREPLIED_COMMENTS_LIMIT,
    }),
    DashboardRepo.countUnrepliedComments(db),
    ConfigRepo.getSystemConfig(db),
    DashboardRepo.countWritingEventsByHour(db, writingSince),
  ]);
  const config = resolveSystemConfig(storedConfig);

  return {
    popularityAlert: alert,
    adminEmailNeedsSetup: adminEmailNeedsSetup(config),
    defaultSiteIdentity: siteIdentityIsDefault(config.site),
    update: cachedUpdate?.hasUpdate
      ? {
          latestVersion: cachedUpdate.latestVersion,
          releaseUrl: cachedUpdate.releaseUrl,
        }
      : null,
    stats: {
      publishedPosts: postCounts.published,
      draftPosts: postCounts.draft,
      comments: commentCounts.total,
      recentComments: commentCounts.recent,
      approvedFriendLinks: friendLinkCounts.approved,
      pendingFriendLinks: friendLinkCounts.pending,
    },
    popularity,
    writingActivity,
    latestDraft,
    recentPosts: recentPosts
      .filter((post) => post.id !== latestDraft?.id)
      .slice(0, DASHBOARD_RECENT_POSTS_LIMIT),
    pendingFriendLinks: {
      items: pendingItems.map((item) => ({
        id: item.id,
        siteName: item.siteName,
        siteUrl: item.siteUrl,
        logoUrl: item.logoUrl,
        createdAt: item.createdAt,
      })),
      remainingCount: Math.max(
        0,
        friendLinkCounts.pending - pendingItems.length,
      ),
    },
    unrepliedComments: {
      total: unrepliedTotal,
      items: toDashboardComments(unrepliedItems),
    },
  };
}

function toDashboardComments(
  rows: Awaited<ReturnType<typeof DashboardRepo.listUnrepliedComments>>,
): Array<DashboardComment> {
  return rows.flatMap((comment): Array<DashboardComment> => {
    const common = {
      id: comment.id,
      rootId: comment.rootId,
      userId: comment.userId,
      userName: comment.userName,
      userImage: comment.userImage,
      userMuted: isMuted(comment.userMutedAt),
      snippet: commentSnippet(comment.content),
      createdAt: comment.createdAt,
    };
    if (comment.momentId !== null && comment.momentText !== null) {
      return [
        {
          ...common,
          postId: null,
          postTitle: null,
          postSlug: null,
          momentId: comment.momentId,
          momentTitle: momentHeading({
            text: comment.momentText,
            hasVideo: comment.momentHasVideo,
          }),
          commentPath: publicCommentPath(
            { type: "moment", id: comment.momentId },
            comment.id,
          ),
        },
      ];
    }
    if (!comment.postSlug || comment.postId === null) return [];
    return [
      {
        ...common,
        postId: comment.postId,
        postTitle: comment.postTitle,
        postSlug: comment.postSlug,
        momentId: null,
        momentTitle: null,
        commentPath: publicCommentPath(
          { type: "post", slug: comment.postSlug },
          comment.id,
        ),
      },
    ];
  });
}

/** One page of every unreplied Comment, newest first, with the total. */
export async function listUnrepliedComments(
  context: DbContext,
  input: UnrepliedCommentsInput,
) {
  const [rows, total] = await Promise.all([
    DashboardRepo.listUnrepliedComments(context.db, {
      // One extra tells whether another page follows.
      limit: input.limit + 1,
      beforeId: input.beforeId,
    }),
    DashboardRepo.countUnrepliedComments(context.db),
  ]);
  const page = rows.slice(0, input.limit);
  return {
    items: toDashboardComments(page),
    total,
    nextBeforeId:
      rows.length > input.limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}
