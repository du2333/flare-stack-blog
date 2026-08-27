import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Database, FileText } from "lucide-react";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { StatCard } from "@/features/dashboard/components/stat-card";
import type { ActivityLogItem } from "@/features/dashboard/dashboard.schema";
import { dashboardStatsQuery } from "@/features/dashboard/queries";
import { formatBytes, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/")({
  ssr: "data-only",
  component: DashboardOverview,
  pendingComponent: DashboardSkeleton,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardStatsQuery);
    return { title: m.admin_overview_title() };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function DashboardOverview() {
  const { data } = useSuspenseQuery(dashboardStatsQuery);
  const { stats, activities } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-300 mx-auto">
      <header className="space-y-1 border-b border-border/30 pb-6">
        <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
          {m.admin_overview_heading()}
        </h1>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          {m.admin_overview_status()}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/admin/posts" search={{ status: "PUBLISHED" }}>
          <StatCard
            label={m.admin_overview_stat_published_posts()}
            value={stats.publishedPosts.toString()}
            icon={<FileText size={14} />}
            trend={m.admin_overview_trend_active_content()}
          />
        </Link>
        <StatCard
          label={m.admin_overview_stat_media_storage()}
          value={formatBytes(stats.mediaSize)}
          icon={<Database size={14} />}
          trend={m.admin_overview_trend_storage_usage()}
        />
        <Link to="/admin/posts" search={{ status: "DRAFT" }}>
          <StatCard
            label={m.admin_overview_stat_drafts()}
            value={stats.drafts.toString()}
            icon={<Activity size={14} />}
            trend={m.admin_overview_trend_in_progress()}
          />
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
          {m.admin_overview_activity_title()}
        </h2>
        <div className="border border-border/30 bg-background p-4 min-h-50">
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((log: ActivityLogItem, index: number) => {
                const content = (
                  <div className="flex gap-3 group/item">
                    <div className="text-[9px] font-mono text-muted-foreground/50 w-16 pt-0.5 shrink-0">
                      {formatTimeAgo(log.time)}
                    </div>
                    <p className="text-[10px] text-muted-foreground group-hover/item:text-foreground transition-colors leading-relaxed">
                      {log.text}
                    </p>
                  </div>
                );

                return log.link ? (
                  <Link key={index} to={log.link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={index}>{content}</div>
                );
              })
            ) : (
              <div className="text-[10px] font-mono text-muted-foreground">
                {m.admin_overview_no_activity()}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
