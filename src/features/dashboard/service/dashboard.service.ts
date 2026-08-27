import { publicCommentPath } from "@/features/comments/comment-url";
import * as DashboardRepo from "@/features/dashboard/data/dashboard.data";
import * as MediaRepo from "@/features/media/data/media.data";
import { m } from "@/paraglide/messages";

export async function getDashboardStats(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const { db } = context;

  const [
    publishedPosts,
    drafts,
    mediaSize,
    recentComments,
    recentPosts,
    recentUsers,
  ] = await Promise.all([
    DashboardRepo.getPublishedPostsCount(db),
    DashboardRepo.getDraftsCount(db),
    MediaRepo.getTotalMediaSize(db),
    DashboardRepo.getRecentComments(db, 10),
    DashboardRepo.getRecentPosts(db, 10),
    DashboardRepo.getRecentUsers(db, 10),
  ]);

  const activities = [
    ...recentComments
      .filter((c) => c.posts !== null)
      .map((c) => ({
        type: "comment" as const,
        text: m.admin_overview_activity_comment({
          userName: c.user?.name || m.admin_overview_activity_anonymous(),
          postTitle: c.posts!.title,
        }),
        time: c.comments.createdAt,
        link: publicCommentPath(c.posts!.slug, c.comments.id),
      })),
    ...recentPosts.map((p) => ({
      type: "post" as const,
      text: m.admin_overview_activity_post_published({
        postTitle: p.title,
      }),
      time: p.publishedAt,
      link: `/post/${p.slug}`,
    })),
    ...recentUsers.map((u) => ({
      type: "user" as const,
      text: m.admin_overview_activity_user_registered({
        userName: u.name,
      }),
      time: u.createdAt,
    })),
  ]
    .sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 10);

  return {
    stats: {
      publishedPosts,
      drafts,
      mediaSize,
    },
    activities,
  };
}
