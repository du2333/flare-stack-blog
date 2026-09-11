import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

function invalidateMuteViews(
  queryClient: ReturnType<typeof useQueryClient>,
  postId?: number,
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: orpc.mutedUsers.list.key() }),
  ];
  if (postId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: orpc.comments.roots.key({ input: { postId } }),
      }),
    );
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: orpc.comments.replies.key({ input: { postId } }),
      }),
    );
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: orpc.comments.thread.key({ input: { postId } }),
      }),
    );
  }
  return Promise.all(invalidations);
}

export function useMutedUsers(postId?: number) {
  const queryClient = useQueryClient();

  const muteMutation = useMutation({
    mutationFn: (input: { userId: string }) =>
      orpcClient.mutedUsers.mute(input),
    onSuccess: async () => {
      await invalidateMuteViews(queryClient, postId);
      toast.success(m.comments_toast_mute_success());
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
      await invalidateMuteViews(queryClient, postId);
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
