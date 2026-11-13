import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { refreshUnrepliedComments } from "@/features/dashboard/hooks/use-handled-comments";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

/**
 * Reload what changes when a Comment is handled, answered, deleted or its
 * author muted: the Comments page and every unreplied count (the overview's
 * and the sidebar's).
 */
export function useRefreshAdminComments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.comments.admin.key() }),
      refreshUnrepliedComments(queryClient),
    ]);
}

/** Mark a Comment handled (with an undo in the toast), undo it, or mark them all. */
export function useAdminCommentActions() {
  const refresh = useRefreshAdminComments();

  const unmark = useMutation({
    mutationFn: (id: number) => orpcClient.comments.admin.unmarkHandled({ id }),
    onSuccess: () => toast.success(m.admin_comments_unmarked_handled()),
    onError: () => toast.error(m.admin_comments_action_error()),
    onSettled: refresh,
  });

  const mark = useMutation({
    mutationFn: (id: number) => orpcClient.comments.admin.markHandled({ id }),
    onSuccess: (_result, id) => {
      toast.success(m.admin_comments_marked_handled(), {
        action: {
          label: m.admin_comments_undo(),
          onClick: () => unmark.mutate(id),
        },
      });
    },
    onError: () => toast.error(m.admin_comments_action_error()),
    onSettled: refresh,
  });

  const markAll = useMutation({
    mutationFn: () => orpcClient.comments.admin.markAllHandled(),
    onSuccess: ({ count }) =>
      toast.success(m.admin_comments_handled_all({ count })),
    onError: () => toast.error(m.admin_comments_action_error()),
    onSettled: refresh,
  });

  return {
    markHandled: mark.mutate,
    unmarkHandled: unmark.mutate,
    markAllHandled: markAll.mutateAsync,
    isMarkingAll: markAll.isPending,
  };
}
