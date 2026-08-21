import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type {
  ApproveFriendLinkInput,
  CreateFriendLinkInput,
  DeleteFriendLinkInput,
  RejectFriendLinkInput,
  SubmitFriendLinkInput,
  UpdateFriendLinkInput,
} from "../friend-links.schema";

export function useFriendLinks() {
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (input: SubmitFriendLinkInput) =>
      orpcClient.friendLinks.submit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.mine.key() });
      toast.success(m.friend_links_toast_submit_success(), {
        description: m.friend_links_toast_submit_success_desc(),
      });
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          DUPLICATE_URL: () => {
            toast.error(m.friend_links_toast_submit_duplicate());
          },
        },
        fallback: () => {},
      });
    },
  });

  return {
    submit: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}

export function useAdminFriendLinks() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CreateFriendLinkInput) =>
      orpcClient.friendLinks.admin.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.key() });
      toast.success(m.friend_links_toast_create_success());
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateFriendLinkInput) =>
      orpcClient.friendLinks.admin.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.key() });
      toast.success(m.friend_links_toast_update_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          NOT_FOUND: () => {
            toast.error(m.friend_links_toast_update_not_found());
          },
        },
        fallback: () => {},
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (input: ApproveFriendLinkInput) =>
      orpcClient.friendLinks.admin.approve(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.key() });
      toast.success(m.friend_links_toast_approve_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          NOT_FOUND: () => {
            toast.error(m.friend_links_toast_approve_not_found());
          },
        },
        fallback: () => {},
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (input: RejectFriendLinkInput) =>
      orpcClient.friendLinks.admin.reject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.key() });
      toast.success(m.friend_links_toast_reject_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          NOT_FOUND: () => {
            toast.error(m.friend_links_toast_reject_not_found());
          },
        },
        fallback: () => {},
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (input: DeleteFriendLinkInput) =>
      orpcClient.friendLinks.admin.remove(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.friendLinks.key() });
      toast.success(m.friend_links_toast_delete_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          NOT_FOUND: () => {
            toast.error(m.friend_links_toast_delete_not_found());
          },
        },
        fallback: () => {},
      });
    },
  });

  return {
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    approve: approveMutation.mutate,
    approveAsync: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutate,
    rejectAsync: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    adminDelete: deleteMutation.mutate,
    isAdminDeleting: deleteMutation.isPending,
  };
}
