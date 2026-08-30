import { useSuspenseQuery } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { cn, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardOverviewQuery);
  const { popularityAlert, recentPosts, pendingFriendLinks, recentComments } =
    data;
  const showFriendLinks = pendingFriendLinks.items.length > 0;
  const showComments = recentComments.length > 0;

  return (
    <div
      data-admin-legacy
      className="space-y-8 animate-in fade-in duration-500 max-w-300 mx-auto"
    >
      <header className="border-b border-border/30 pb-6">
        <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
          {m.admin_overview_heading()}
        </h1>
      </header>

      {popularityAlert ? (
        <Link
          to="/admin/settings"
          search={{ tab: "maintenance" }}
          className="block border border-border/30 bg-background p-4 hover:border-border/60 transition-colors"
        >
          <p className="text-sm text-foreground">
            {popularityAlert === "failed"
              ? m.admin_overview_popularity_failed()
              : m.admin_overview_popularity_expired()}
          </p>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.admin_overview_popularity_action()}
          </p>
        </Link>
      ) : null}

      {recentPosts.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            {m.admin_overview_continue_writing()}
          </h2>
          <ul className="divide-y divide-border/30 border border-border/30">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                  className="flex items-baseline justify-between gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
                >
                  <span className="min-w-0 truncate font-serif text-lg text-foreground">
                    {post.title.trim() || m.common_untitled()}
                  </span>
                  <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {post.status === "published"
                      ? m.admin_posts_status_published()
                      : m.admin_posts_status_draft()}
                    {" · "}
                    <ClientOnly fallback="-">
                      {formatTimeAgo(post.updatedAt)}
                    </ClientOnly>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showFriendLinks || showComments ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {showFriendLinks ? (
            <section
              className={cn("space-y-4", !showComments && "lg:col-span-2")}
            >
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                {m.admin_overview_pending_friend_links()}
              </h2>
              <ul className="divide-y divide-border/30 border border-border/30">
                {pendingFriendLinks.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to="/admin/friend-links"
                      search={{ status: "pending", page: 1 }}
                      className="flex items-baseline justify-between gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <span className="min-w-0 truncate text-sm text-foreground">
                        {item.siteName}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                        <ClientOnly fallback="-">
                          {formatTimeAgo(item.createdAt)}
                        </ClientOnly>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingFriendLinks.remainingCount > 0 ? (
                <Link
                  to="/admin/friend-links"
                  search={{ status: "pending", page: 1 }}
                  className="inline-block text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
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
              className={cn("space-y-4", !showFriendLinks && "lg:col-span-2")}
            >
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                {m.admin_overview_recent_comments()}
              </h2>
              <ul className="divide-y divide-border/30 border border-border/30">
                {recentComments.map((comment) => (
                  <li key={comment.id}>
                    <Link
                      to="/post/$slug"
                      params={{ slug: comment.postSlug }}
                      search={{ comment: comment.id }}
                      className="block px-4 py-4 hover:bg-muted/30 transition-colors space-y-1"
                    >
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {comment.userName ||
                          m.admin_overview_activity_anonymous()}
                        {" · "}
                        {comment.postTitle}
                        {" · "}
                        <ClientOnly fallback="-">
                          {formatTimeAgo(comment.createdAt)}
                        </ClientOnly>
                      </p>
                      {comment.snippet ? (
                        <p className="text-sm text-foreground line-clamp-2">
                          {comment.snippet}
                        </p>
                      ) : null}
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
