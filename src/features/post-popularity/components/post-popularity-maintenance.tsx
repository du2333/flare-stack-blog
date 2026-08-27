import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postPopularityStatusQuery } from "@/features/post-popularity/queries";
import { orpcClient } from "@/lib/orpc";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function utcDate(value: number | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

export function PostPopularityMaintenance() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery(postPopularityStatusQuery);
  const syncMutation = useMutation({
    mutationFn: () => orpcClient.postPopularity.sync(),
    onSuccess: (result) => {
      queryClient.setQueryData(postPopularityStatusQuery.queryKey, result);
      toast.success(m.settings_maintenance_popularity_toast_success());
    },
    onError: () => {
      toast.error(m.settings_maintenance_popularity_toast_error());
    },
    onSettled: () => {
      queryClient.invalidateQueries(postPopularityStatusQuery);
    },
  });
  const statusLabel = !status
    ? "-"
    : !status.configured
      ? m.settings_maintenance_popularity_status_unconfigured()
      : !status.lastSuccessAt
        ? m.settings_maintenance_popularity_status_pending()
        : status.expired
          ? m.settings_maintenance_popularity_status_expired()
          : m.settings_maintenance_popularity_status_ready();

  return (
    <section className="border border-border/30 bg-background/50 p-8 space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="rounded-sm bg-orange-500/10 p-3">
              <BarChart3 size={20} className="text-orange-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-medium text-foreground tracking-tight">
                {m.settings_maintenance_popularity_title()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {m.settings_maintenance_popularity_desc()}
              </p>
            </div>
          </div>

          <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-x-8">
            <div>
              <dt className="inline">
                {m.settings_maintenance_popularity_status_label()}
              </dt>{" "}
              <dd className="inline text-foreground">{statusLabel}</dd>
            </div>
            <div>
              <dt className="inline">
                {m.settings_maintenance_popularity_posts_label()}
              </dt>{" "}
              <dd className="inline text-foreground">
                {status?.postCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="inline">
                {m.settings_maintenance_popularity_last_success_label()}
              </dt>{" "}
              <dd className="inline text-foreground">
                {status?.lastSuccessAt
                  ? formatDate(status.lastSuccessAt, { includeTime: true })
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="inline">
                {m.settings_maintenance_popularity_window_label()}
              </dt>{" "}
              <dd className="inline text-foreground">
                {utcDate(status?.windowStart ?? null)} -{" "}
                {utcDate(status?.windowEnd ?? null)} UTC
              </dd>
            </div>
          </dl>

          {status?.lastError && (
            <p className="text-sm text-red-600 dark:text-red-400 break-words">
              {status.lastError}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="h-10 shrink-0 rounded-none border-border/50 px-6 font-mono text-[10px] uppercase tracking-[0.2em]"
        >
          <RefreshCw
            size={12}
            className={syncMutation.isPending ? "animate-spin mr-3" : "mr-3"}
          />
          {syncMutation.isPending
            ? m.settings_maintenance_popularity_syncing()
            : m.settings_maintenance_popularity_sync_btn()}
        </Button>
      </div>
    </section>
  );
}
