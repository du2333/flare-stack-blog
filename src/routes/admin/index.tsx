import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Database,
  Eye,
  FileText,
  MessageSquare,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import type {
  ActivityLogItem,
  DashboardRange,
} from "@/features/dashboard/dashboard.schema";
import { dashboardStatsQuery } from "@/features/dashboard/queries";
import { useVersionCheck } from "@/features/version/hooks/use-version-check";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes, formatTimeAgo } from "@/lib/utils";
import { refreshDashboardCacheFn } from "@/features/dashboard/dashboard.api";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TrafficChart } from "@/features/dashboard/components/traffic-chart";
import { MetricItem } from "@/features/dashboard/components/metric-item";

const SearchSchema = z.object({
  range: z.enum(["24h", "7d", "30d", "90d"]).default("24h").optional(),
});

export const Route = createFileRoute("/admin/")({
  component: DashboardOverview,
  pendingComponent: DashboardSkeleton,
  validateSearch: (search) => SearchSchema.parse(search),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(dashboardStatsQuery);
    return { title: "概览" };
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
  const { range = "24h" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data, isFetching } = useSuspenseQuery(dashboardStatsQuery);
  const { stats, activities, trafficByRange, umamiUrl } = data;

  // 检查版本更新
  useVersionCheck();

  const refreshDashboardCacheMutation = useMutation({
    mutationFn: refreshDashboardCacheFn,
    onSuccess: () => {
      queryClient.invalidateQueries(dashboardStatsQuery);
      toast.success("数据已刷新");
    },
    onError: () => {
      toast.error("刷新失败，请重试");
    },
  });

  const currentRangeData = trafficByRange?.[range];
  const traffic = currentRangeData?.traffic;
  const overview = currentRangeData?.overview;
  const topPages = currentRangeData?.topPages;
  const lastUpdated = currentRangeData?.lastUpdated;

  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const rangeLabel = {
    "24h": "24小时",
    "7d": "7天",
    "30d": "30天",
    "90d": "90天",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-300 mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            仪表盘
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              SYSTEM_OPERATIONAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 self-start md:self-auto">
          <Tabs
            value={range}
            onValueChange={(val) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  range: val as DashboardRange,
                }),
              })
            }
          >
            <TabsList className="bg-transparent border-none p-0 gap-4 md:gap-6">
              {Object.entries(rangeLabel).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="px-0 py-2 h-auto rounded-none text-[10px] font-mono text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-foreground/80 transition-colors"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => refreshDashboardCacheMutation.mutate({})}
                  disabled={isFetching}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-2 hover:bg-muted/30 rounded-sm"
                >
                  <RefreshCw
                    size={14}
                    className={isFetching ? "animate-spin" : ""}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>刷新数据</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/comments" search={{ status: "pending" }}>
          <StatCard
            label="待审核评论"
            value={stats.pendingComments.toString()}
            icon={<MessageSquare size={14} />}
            trend={stats.pendingComments > 0 ? "需要处理" : "一切正常"}
          />
        </Link>
        <Link to="/admin/posts" search={{ status: "PUBLISHED" }}>
          <StatCard
            label="已发布文章"
            value={stats.publishedPosts.toString()}
            icon={<FileText size={14} />}
            trend="活跃内容"
          />
        </Link>
        <StatCard
          label="媒体库占用"
          value={formatBytes(stats.mediaSize)}
          icon={<Database size={14} />}
          trend="存储使用"
        />
        <Link to="/admin/posts" search={{ status: "DRAFT" }}>
          <StatCard
            label="草稿箱"
            value={stats.drafts.toString()}
            icon={<Activity size={14} />}
            trend="进行中"
          />
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Traffic Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              流量概览
            </h2>
            {umamiUrl && (
              <a
                href={umamiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors uppercase tracking-widest"
              >
                打开统计 <ArrowRight size={10} />
              </a>
            )}
          </div>

          {/* Metrics Row */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricItem
                label="访客数"
                value={overview.visitors.value}
                prev={overview.visitors.prev}
                icon={<Users size={12} />}
              />
              <MetricItem
                label="浏览量"
                value={overview.pageViews.value}
                prev={overview.pageViews.prev}
                icon={<Eye size={12} />}
              />
              <MetricItem
                label="总访问"
                value={overview.visits.value}
                prev={overview.visits.prev}
                icon={<MousePointerClick size={12} />}
              />
              <MetricItem
                label="跳出率"
                value={overview.bounces.value}
                prev={overview.bounces.prev}
                total={overview.visits.value}
                format="percent"
                icon={<Activity size={12} />}
              />
            </div>
          )}

          {/* Chart Area */}
          <div className="h-75 w-full border border-border/30 bg-background p-6">
            {!umamiUrl ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="bg-muted/20 p-4 rounded-full">
                  <Activity className="opacity-40" size={24} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-mono text-foreground">
                    统计未配置
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    请配置 UMAMI_URL 环境变量
                  </p>
                </div>
              </div>
            ) : traffic && traffic.length > 0 ? (
              <TrafficChart data={traffic} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="opacity-20" size={32} />
                <p className="text-[10px] font-mono uppercase tracking-widest">
                  暂无流量数据
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity & Content */}
        <div className="space-y-8">
          {/* Top Pages */}
          <div className="space-y-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              热门内容
            </h2>
            <div className="border border-border/30 bg-background p-4 space-y-4">
              {topPages && topPages.length > 0 ? (
                topPages.slice(0, 5).map((page, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="text-xs text-foreground/80 font-medium truncate max-w-45 group-hover:text-foreground transition-colors">
                        {page.x}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {page.y}
                      </div>
                    </div>
                    <div className="w-full bg-muted/20 h-0.5 rounded-full overflow-hidden">
                      <div
                        className="bg-foreground/40 h-full"
                        style={{
                          width: `${(page.y / Math.max(...topPages.map((p) => p.y))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] font-mono text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              系统日志
            </h2>
            <div className="border border-border/30 bg-background p-4 min-h-50">
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.map((log: ActivityLogItem, i: number) => {
                    const Content = () => (
                      <div className="flex gap-3 group/item">
                        <div className="text-[9px] font-mono text-muted-foreground/50 w-16 pt-0.5 shrink-0">
                          {formatTimeAgo(log.time)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground group-hover/item:text-foreground transition-colors leading-relaxed">
                            {log.text}
                          </p>
                        </div>
                      </div>
                    );

                    if (log.link) {
                      return (
                        <Link key={i} to={log.link} className="block">
                          <Content />
                        </Link>
                      );
                    }
                    return <Content key={i} />;
                  })
                ) : (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    暂无活动
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-[9px] font-mono text-muted-foreground/30 text-center pt-8 uppercase tracking-widest">
          最后更新: {lastUpdatedTime}
        </div>
      )}
    </div>
  );
}
