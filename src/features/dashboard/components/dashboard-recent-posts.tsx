import { ClientOnly, Link } from "@tanstack/react-router";
import { ArrowRight, Pin } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-heading";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { postStateOf } from "@/features/posts/components/post-state";
import { PostStatusBadge } from "@/features/posts/components/post-status-badge";
import { cn, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The last few Posts edited, drafts included, newest first. */
export function DashboardRecentPosts({
  recentPosts,
  className,
}: Pick<DashboardOverview, "recentPosts"> & { className?: string }) {
  return (
    <section className={cn("dashboard-section dashboard-recent", className)}>
      <SectionHeading
        size="md"
        title={m.dashboard_recent_edits()}
        actions={
          recentPosts.length > 0 ? (
            <Link
              to="/admin/posts"
              className={buttonClass({ variant: "text", size: "sm" })}
            >
              {m.admin_overview_all_posts()}
              <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />
      {recentPosts.length === 0 ? (
        <EmptyState size="compact" description={m.dashboard_recent_empty()} />
      ) : (
        <ul className="dashboard-recent-list">
          {recentPosts.map((post) => (
            <li key={post.id}>
              <Link
                to="/admin/posts/edit/$id"
                params={{ id: String(post.id) }}
                className="admin-list-row dashboard-recent-post"
              >
                <span className="dashboard-recent-title">
                  {post.title.trim() || m.common_untitled()}
                </span>
                {post.pinnedAt ? (
                  <Pin
                    size={13}
                    className="dashboard-pin"
                    aria-label={m.admin_posts_pinned()}
                  />
                ) : null}
                <PostStatusBadge
                  state={postStateOf({
                    published: post.status === "published",
                    hasUnpublishedChanges: post.hasUnpublishedChanges,
                  })}
                />
                <time className="dashboard-time">
                  <ClientOnly fallback="—">
                    {formatTimeAgo(post.updatedAt)}
                  </ClientOnly>
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
