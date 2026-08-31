import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { postPopularityStatusQuery } from "@/features/post-popularity/queries";
import { orpcClient } from "@/lib/orpc";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
    <div className="flex items-center gap-3 py-4 border-b border-(--fuwari-input-border)">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium fuwari-text-90">
          {m.settings_maintenance_popularity_title()}
        </p>
        <p className="text-xs fuwari-text-50">
          {statusLabel}
          {status?.postCount != null ? ` · ${status.postCount}` : ""}
          {status?.lastSuccessAt
            ? ` · ${formatDate(status.lastSuccessAt, { includeTime: true })}`
            : ""}
        </p>
        <p className="text-xs fuwari-text-50">
          {m.settings_maintenance_popularity_auto()}
        </p>
        {status?.lastError ? (
          <p className="mt-1 text-xs text-(--fuwari-danger-fg) break-words">
            {status.lastError}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        {syncMutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : null}
        {syncMutation.isPending
          ? m.settings_maintenance_popularity_syncing()
          : m.settings_maintenance_popularity_sync_btn()}
      </button>
    </div>
  );
}
