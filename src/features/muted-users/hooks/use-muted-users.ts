import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { CommentTarget } from "@/features/comments/comment-target";
import { commentViewKeys } from "@/features/comments/queries";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

function invalidateMuteViews(
  queryClient: ReturnType<typeof useQueryClient>,
  target?: CommentTarget,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.mutedUsers.list.key() }),
    ...(target
      ? commentViewKeys(target).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        )
      : []),
  ]);
}

export function useMutedUsers(
  target?: CommentTarget,
  options: { linkMutedList?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const muteMutation = useMutation({
    mutationFn: (input: { userId: string }) =>
      orpcClient.mutedUsers.mute(input),
    onSuccess: async () => {
      await invalidateMuteViews(queryClient, target);
      toast.success(
        m.comments_toast_mute_success(),
        options.linkMutedList
          ? {
              action: {
                label: m.admin_overview_view_muted_users(),
                onClick: () =>
                  void navigate({ to: "/admin/settings/muted-users" }),
              },
            }
          : undefined,
      );
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          USER_NOT_FOUND: () => {
            toast.error(m.comments_toast_user_not_found());
          },
          CANNOT_MUTE_ADMIN: () => {
            toast.error(m.comments_toast_cannot_mute_admin());
          },
        },
        fallback: () => {
          toast.error(m.muted_users_toast_error());
        },
      });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (input: { userId: string }) =>
      orpcClient.mutedUsers.unmute(input),
    onSuccess: async () => {
      await invalidateMuteViews(queryClient, target);
      toast.success(m.comments_toast_unmute_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          USER_NOT_FOUND: () => {
            toast.error(m.comments_toast_user_not_found());
          },
        },
        fallback: () => {
          toast.error(m.muted_users_toast_error());
        },
      });
    },
  });

  return {
    muteUser: muteMutation.mutateAsync,
    unmuteUser: unmuteMutation.mutateAsync,
    isMuting: muteMutation.isPending,
    isUnmuting: unmuteMutation.isPending,
  };
}
