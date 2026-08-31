import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { Pin } from "lucide-react";
import { useEffect } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { cn, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardOverviewQuery);
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

  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <h1 className="text-2xl font-medium fuwari-text-90">
          {m.admin_overview_title()}
        </h1>
        <button
          type="button"
          onClick={() => createPost()}
          disabled={isCreating}
          className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
        >
          {createLabel}
        </button>
      </div>

      <AttentionChips
        pendingTotal={pendingTotal}
        popularityAlert={popularityAlert}
        adminEmailNeedsSetup={adminEmailNeedsSetup}
        defaultSiteIdentity={defaultSiteIdentity}
      />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium fuwari-text-50">
            {m.admin_overview_continue_writing()}
          </h2>
          <Link
            to="/admin/posts"
            className="text-sm text-(--fuwari-primary) shrink-0"
          >
            {m.admin_overview_all_posts()}
          </Link>
        </div>
        {recentPosts.length > 0 ? (
          <ul>
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-xl px-3 py-3 hover:bg-(--fuwari-btn-regular-bg) transition-colors"
                >
                  <span className="min-w-0 text-base fuwari-text-90 sm:truncate">
                    {post.title.trim() || m.common_untitled()}
                  </span>
                  <span className="shrink-0 flex items-center gap-2 text-xs fuwari-text-50">
                    {post.pinnedAt ? (
                      <span className="inline-flex items-center gap-1 text-(--fuwari-primary)">
                        <Pin size={12} strokeWidth={1.5} />
                        {m.admin_posts_pinned()}
                      </span>
                    ) : null}
                    <StatusPill published={post.status === "published"} />
                    <ClientOnly fallback="-">
                      {formatTimeAgo(post.updatedAt)}
                    </ClientOnly>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-8 flex flex-col items-center gap-3 fuwari-text-50">
            <p>{m.admin_posts_empty_library()}</p>
            <button
              type="button"
              onClick={() => createPost()}
              disabled={isCreating}
              className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
            >
              {createLabel}
            </button>
          </div>
        )}
      </section>

      {showFriendLinks || showComments ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-(--fuwari-input-border)">
          {showFriendLinks ? (
            <section
              className={cn("space-y-3", !showComments && "lg:col-span-2")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium fuwari-text-50">
                  {m.admin_overview_pending_friend_links()}
                </h2>
                <Link
                  to="/admin/friend-links"
                  search={{ status: "pending", page: 1 }}
                  className="text-sm text-(--fuwari-primary) shrink-0"
                >
                  {m.admin_overview_review_friend_links()}
                </Link>
              </div>
              <ul>
                {pendingFriendLinks.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to="/admin/friend-links"
                      search={{ status: "pending", page: 1 }}
                      className="block rounded-xl px-3 py-3 hover:bg-(--fuwari-btn-regular-bg) transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm fuwari-text-90">
                          {item.siteName}
                        </span>
                        <span className="shrink-0 text-xs fuwari-text-50">
                          <ClientOnly fallback="-">
                            {formatTimeAgo(item.createdAt)}
                          </ClientOnly>
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs fuwari-text-50">
                        {item.siteUrl}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingFriendLinks.remainingCount > 0 ? (
                <Link
                  to="/admin/friend-links"
                  search={{ status: "pending", page: 1 }}
                  className="inline-block px-3 text-sm text-(--fuwari-primary)"
                >
                  {m.admin_overview_friend_links_remaining({
                    count: pendingFriendLinks.remainingCount,
                  })}
                </Link>
              ) : null}
            </section>
          ) : null}

          {showComments ? (
            <section
              className={cn(
                "space-y-3",
                !showFriendLinks && "lg:col-span-2",
                showFriendLinks &&
                  "lg:border-l lg:border-(--fuwari-input-border) lg:pl-8",
              )}
            >
              <h2 className="text-sm font-medium fuwari-text-50">
                {m.admin_overview_recent_comments()}
              </h2>
              <ul>
                {recentComments.map((comment) => (
                  <li key={comment.id}>
                    <Link
                      to="/post/$slug"
                      params={{ slug: comment.postSlug }}
                      search={{ comment: comment.id }}
                      className="block rounded-xl px-3 py-3 hover:bg-(--fuwari-btn-regular-bg) transition-colors space-y-1"
                    >
                      {comment.snippet ? (
                        <p className="text-sm fuwari-text-90 line-clamp-2">
                          {comment.snippet}
                        </p>
                      ) : null}
                      <p className="text-xs fuwari-text-50">
                        {comment.userName ||
                          m.admin_overview_activity_anonymous()}
                        {" · "}
                        {comment.postTitle}
                        {" · "}
                        <ClientOnly fallback="-">
                          {formatTimeAgo(comment.createdAt)}
                        </ClientOnly>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AttentionChips({
  pendingTotal,
  popularityAlert,
  adminEmailNeedsSetup,
  defaultSiteIdentity,
}: {
  pendingTotal: number;
  popularityAlert: DashboardOverview["popularityAlert"];
  adminEmailNeedsSetup: boolean;
  defaultSiteIdentity: boolean;
}) {
  if (
    pendingTotal === 0 &&
    !popularityAlert &&
    !adminEmailNeedsSetup &&
    !defaultSiteIdentity
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pendingTotal > 0 ? (
        <Link
          to="/admin/friend-links"
          search={{ status: "pending", page: 1 }}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) text-sm font-medium"
        >
          {m.admin_overview_pending_friend_links()}
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-(--fuwari-primary) text-white dark:text-black/75 text-xs grid place-items-center">
            {pendingTotal}
          </span>
        </Link>
      ) : null}
      {adminEmailNeedsSetup ? (
        <Link
          to="/admin/settings"
          search={{ tab: "email" }}
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) text-sm font-medium"
        >
          {m.admin_overview_email_needs_setup()}
        </Link>
      ) : null}
      {popularityAlert === "expired" ? (
        <Link
          to="/admin/settings"
          search={{ tab: "maintenance" }}
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) text-sm font-medium"
        >
          {m.admin_overview_popularity_expired()}
        </Link>
      ) : null}
      {popularityAlert === "failed" ? (
        <Link
          to="/admin/settings"
          search={{ tab: "maintenance" }}
          className="inline-flex items-center h-9 px-3.5 rounded-full bg-(--fuwari-danger-bg) text-(--fuwari-danger-fg) text-sm font-medium"
        >
          {m.admin_overview_popularity_failed()}
        </Link>
      ) : null}
      {defaultSiteIdentity ? (
        <Link
          to="/admin/settings"
          search={{ tab: "site" }}
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
