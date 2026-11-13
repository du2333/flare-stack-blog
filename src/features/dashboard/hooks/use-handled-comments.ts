import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { overviewWithoutComment } from "@/features/dashboard/unreplied-comments";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

/** Reload what shows unreplied Comments: the overview and the sidebar's count. */
export function refreshUnrepliedComments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
}

/**
 * Mark one Comment handled: it leaves the overview's list at once, with an
 * undo in the toast.
 */
export function useHandledComments() {
  const queryClient = useQueryClient();
  const overviewKey = orpc.dashboard.overview.queryKey();

  const unmarkMutation = useMutation({
    mutationFn: (id: number) => orpcClient.comments.admin.unmarkHandled({ id }),
    onError: () => toast.error(m.dashboard_comment_handled_error()),
    onSettled: () => refreshUnrepliedComments(queryClient),
  });

  const markMutation = useMutation({
    mutationFn: (id: number) => orpcClient.comments.admin.markHandled({ id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orpc.dashboard.key() });
      const overview = queryClient.getQueryData<DashboardOverview>(overviewKey);
      if (overview)
        queryClient.setQueryData(
          overviewKey,
          overviewWithoutComment(overview, id),
        );
      return { overview };
    },
    onError: (_error, _id, previous) => {
      if (previous?.overview)
        queryClient.setQueryData(overviewKey, previous.overview);
      toast.error(m.dashboard_comment_handled_error());
    },
    onSuccess: (_result, id) => {
      toast.success(m.dashboard_comment_marked_handled(), {
        action: {
          label: m.dashboard_comment_handled_undo(),
          onClick: () => unmarkMutation.mutate(id),
        },
      });
    },
    onSettled: () => refreshUnrepliedComments(queryClient),
  });

  return {
    markHandled: markMutation.mutate,
    /** Settles once the server answers; rejects when it failed (toasted). */
    markHandledAsync: markMutation.mutateAsync,
  };
}
