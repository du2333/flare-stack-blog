import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  DashboardOverview,
  UnrepliedCommentsPage,
} from "@/features/dashboard/dashboard.schema";
import {
  overviewWithoutComment,
  pagesWithoutComment,
} from "@/features/dashboard/unreplied-comments";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

type Pages = InfiniteData<UnrepliedCommentsPage, number | undefined>;

/** Reload what shows unreplied Comments: the overview and the sheet. */
export function refreshUnrepliedComments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
}

/**
 * Mark one Comment handled (it leaves the lists at once, with an undo in the
 * toast), or every unreplied Comment at once.
 */
export function useHandledComments() {
  const queryClient = useQueryClient();
  const overviewKey = orpc.dashboard.overview.queryKey();
  // The sheet's pages only: the sidebar reads the same procedure as a plain
  // query for its count, which this does not reshape.
  const pagesKey = orpc.dashboard.unrepliedComments.key({ type: "infinite" });

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
      const pages = queryClient.getQueriesData<Pages>({ queryKey: pagesKey });
      if (overview)
        queryClient.setQueryData(
          overviewKey,
          overviewWithoutComment(overview, id),
        );
      queryClient.setQueriesData<Pages>({ queryKey: pagesKey }, (data) =>
        data ? pagesWithoutComment(data, id) : data,
      );
      return { overview, pages };
    },
    onError: (_error, _id, previous) => {
      if (previous?.overview)
        queryClient.setQueryData(overviewKey, previous.overview);
      for (const [key, data] of previous?.pages ?? [])
        queryClient.setQueryData(key, data);
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

  const markAllMutation = useMutation({
    mutationFn: () => orpcClient.comments.admin.markAllHandled(),
    onSuccess: ({ count }) => {
      toast.success(m.dashboard_unreplied_handled_all({ count }));
    },
    onError: () => toast.error(m.dashboard_comment_handled_error()),
    onSettled: () => refreshUnrepliedComments(queryClient),
  });

  return {
    markHandled: markMutation.mutate,
    markAllHandled: markAllMutation.mutateAsync,
    isMarkingAll: markAllMutation.isPending,
  };
}
