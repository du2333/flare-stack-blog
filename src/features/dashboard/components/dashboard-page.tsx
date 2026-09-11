import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileText, Pin, Plus } from "lucide-react";
import { useEffect } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { cn, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "./dashboard.css";
import { DashboardIdentity } from "./dashboard-identity";

export function DashboardPage() {
  const { data } = useSuspenseQuery({
    ...dashboardOverviewQuery,
    refetchOnMount: "always",
  });
  const {
    popularityAlert,
    adminEmailNeedsSetup,
    defaultSiteIdentity,
    recentPosts,
    pendingFriendLinks,
    recentComments,
  } = data;
  const pendingTotal =
    pendingFriendLinks.items.length + pendingFriendLinks.remainingCount;
  const showFriendLinks = pendingFriendLinks.items.length > 0;
  const showComments = recentComments.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPrimaryAction } = useAdminChrome();

  const createMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (createdPost) => {
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() });
      queryClient.invalidateQueries({
        queryKey: orpc.dashboard.overview.key(),
      });
      navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(createdPost.id) },
      });
    },
  });
  const createPost = createMutation.mutate;
  const isCreating = createMutation.isPending;
  const createLabel = isCreating
    ? m.admin_posts_creating()
    : m.admin_posts_create();

  useEffect(() => {
    setPrimaryAction({
      label: createLabel,
      onClick: () => createPost(),
      disabled: isCreating,
    });
    return () => setPrimaryAction(null);
  }, [createLabel, createPost, isCreating, setPrimaryAction]);

  const [latest, ...otherPosts] = recentPosts;
  const showTasks =
    showFriendLinks ||
    adminEmailNeedsSetup ||
    defaultSiteIdentity ||
    !!popularityAlert;

  return (
    <div className="dashboard-workspace fuwari-card-base">
      <header className="dashboard-header">
        <div>
          <h1>{m.admin_overview_title()}</h1>
          <p>{m.dashboard_intro()}</p>
        </div>
        <button
          type="button"
          onClick={() => createPost()}
          disabled={isCreating}
          className="dashboard-button fuwari-btn-regular"
        >
          <Plus size={18} />
          {createLabel}
        </button>
      </header>
      <div className="dashboard-layout">
        <section
          className="dashboard-resume"
          aria-label={m.admin_overview_continue_writing()}
        >
          {latest ? (
            <>
              <div className="dashboard-resume-copy">
                <p className="dashboard-eyebrow">
                  {m.admin_overview_continue_writing()}
                </p>
                <div className="dashboard-resume-title">
                  <h2>{latest.title.trim() || m.common_untitled()}</h2>
                  <StatusPill published={latest.status === "published"} />
                </div>
                <p className="dashboard-meta">
                  <FileText size={16} />
                  <ClientOnly fallback="—">
                    {formatTimeAgo(latest.updatedAt)}
                  </ClientOnly>
                </p>
              </div>
              <Link
                to="/admin/posts/edit/$id"
                params={{ id: String(latest.id) }}
                className="dashboard-button fuwari-btn-primary"
              >
                {m.dashboard_resume()}
                <ArrowRight size={18} />
              </Link>
            </>
          ) : (
            <>
              <div className="dashboard-resume-copy">
                <h2>{m.dashboard_first_post()}</h2>
                <p>{m.admin_posts_empty_library()}</p>
              </div>
              <button
                type="button"
                onClick={() => createPost()}
                disabled={isCreating}
                className="dashboard-button fuwari-btn-primary"
              >
                <Plus size={18} />
                {createLabel}
              </button>
            </>
          )}
        </section>
        {otherPosts.length > 0 && (
          <section className="dashboard-recent">
            <div className="dashboard-section-heading">
              <h2>{m.dashboard_recent_edits()}</h2>
              <Link to="/admin/posts" className="dashboard-text-link">
                {m.admin_overview_all_posts()}
                <ArrowRight size={16} />
              </Link>
            </div>
            <ul className="dashboard-posts">
              {otherPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    to="/admin/posts/edit/$id"
                    params={{ id: String(post.id) }}
                    className="dashboard-post"
                  >
                    <span className="dashboard-icon">
                      <FileText size={22} />
                    </span>
                    <div className="dashboard-post-copy">
                      <div className="dashboard-post-title">
                        <strong>
                          {post.title.trim() || m.common_untitled()}
                        </strong>
                        <StatusPill published={post.status === "published"} />
                      </div>
                      <p className="dashboard-meta">
                        {post.pinnedAt && (
                          <span className="dashboard-pin">
                            <Pin size={12} />
                            {m.admin_posts_pinned()}
                          </span>
                        )}
                        <ClientOnly fallback="—">
                          {formatTimeAgo(post.updatedAt)}
                        </ClientOnly>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(showTasks || showComments) && (
          <div
            className={cn(
              "dashboard-activity",
              showTasks && showComments && "dashboard-activity-split",
            )}
          >
            {showTasks && (
              <section className="dashboard-tasks">
                <div className="dashboard-section-heading">
                  <h2>{m.dashboard_tasks()}</h2>
                </div>
                <div className="dashboard-task-scroll">
                  {showFriendLinks && (
                    <>
                      <Link
                        to="/admin/friend-links"
                        search={{ status: "pending", page: 1 }}
                        className="dashboard-task-summary"
                      >
                        <span>
                          {m.dashboard_pending_links({ count: pendingTotal })}
                        </span>
                        <ArrowRight size={17} />
                      </Link>
                      <ul className="dashboard-list">
                        {pendingFriendLinks.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              to="/admin/friend-links"
                              search={{
                                status: "pending",
                                page: 1,
                                search: item.siteUrl,
                              }}
                              className="dashboard-link-row"
                            >
                              <DashboardIdentity
                                kind="site"
                                image={item.logoUrl}
                                siteUrl={item.siteUrl}
                              />
                              <div className="dashboard-row-copy">
                                <strong>{item.siteName}</strong>
                                <p>{siteHost(item.siteUrl)}</p>
                              </div>
                              <time className="dashboard-time">
                                <ClientOnly fallback="—">
                                  {formatTimeAgo(item.createdAt)}
                                </ClientOnly>
                              </time>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/admin/friend-links"
                        search={{ status: "pending", page: 1 }}
                        className="dashboard-text-link dashboard-review-all"
                      >
                        {m.admin_overview_review_friend_links()}
                        <ArrowRight size={16} />
                      </Link>
                    </>
                  )}
                  <AttentionChips
                    popularityAlert={popularityAlert}
                    adminEmailNeedsSetup={adminEmailNeedsSetup}
                    defaultSiteIdentity={defaultSiteIdentity}
                  />
                </div>
              </section>
            )}
            {showComments && (
              <section className="dashboard-comments">
                <div className="dashboard-section-heading">
                  <h2>{m.admin_overview_recent_comments()}</h2>
                </div>
                <ul className="dashboard-list">
                  {recentComments.map((comment) => (
                    <li key={comment.id}>
                      <Link
                        to="/post/$slug"
                        params={{ slug: comment.postSlug }}
                        search={{ comment: comment.id }}
                        className="dashboard-comment"
                      >
                        <DashboardIdentity
                          kind="user"
                          image={comment.userImage}
                        />
                        <div className="dashboard-row-copy">
                          <div className="dashboard-comment-byline">
                            <strong>
                              {comment.userName ||
                                m.admin_overview_activity_anonymous()}
                            </strong>
                            <time className="dashboard-time">
                              <ClientOnly fallback="—">
                                {formatTimeAgo(comment.createdAt)}
                              </ClientOnly>
                            </time>
                          </div>
                          {comment.snippet && (
                            <p className="dashboard-comment-snippet">
                              {comment.snippet}
                            </p>
                          )}
                          <p className="dashboard-comment-source">
                            {comment.postTitle}
                            <ArrowRight size={14} />
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function siteHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function AttentionChips({
  popularityAlert,
  adminEmailNeedsSetup,
  defaultSiteIdentity,
}: {
  popularityAlert: DashboardOverview["popularityAlert"];
  adminEmailNeedsSetup: boolean;
  defaultSiteIdentity: boolean;
}) {
  if (!popularityAlert && !adminEmailNeedsSetup && !defaultSiteIdentity) {
    return null;
  }

  return (
    <div className="dashboard-notices">
      {adminEmailNeedsSetup ? (
        <Link
          from="/"
          to="/admin/settings/notifications"
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) text-sm font-medium"
        >
          {m.admin_overview_email_needs_setup()}
        </Link>
      ) : null}
      {popularityAlert === "expired" ? (
        <Link
          from="/"
          to="/admin/settings/maintenance"
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) text-sm font-medium"
        >
          {m.admin_overview_popularity_expired()}
        </Link>
      ) : null}
      {popularityAlert === "failed" ? (
        <Link
          from="/"
          to="/admin/settings/maintenance"
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-danger-bg) text-(--fuwari-danger-fg) text-sm font-medium"
        >
          {m.admin_overview_popularity_failed()}
        </Link>
      ) : null}
      {defaultSiteIdentity ? (
        <Link
          from="/"
          to="/admin/settings/site"
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) text-sm font-medium"
        >
          {m.admin_overview_default_site_identity()}
        </Link>
      ) : null}
    </div>
  );
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={
        published
          ? "text-xs px-2 py-0.5 rounded-full bg-(--fuwari-success-bg) text-(--fuwari-success-fg)"
          : "text-xs px-2 py-0.5 rounded-full bg-(--fuwari-btn-regular-bg) fuwari-text-50"
      }
    >
      {published
        ? m.admin_posts_status_published()
        : m.admin_posts_status_draft()}
    </span>
  );
}
