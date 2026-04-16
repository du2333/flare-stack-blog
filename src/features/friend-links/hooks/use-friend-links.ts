import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import {
  approveFriendLinkFn,
  createFriendLinkFn,
  deleteFriendLinkFn,
  rejectFriendLinkFn,
  updateFriendLinkFn,
} from "../api/friend-links.admin.api";
import { submitFriendLinkFn } from "../api/friend-links.user.api";
import { FRIEND_LINKS_KEYS } from "../queries";

export function useFriendLinks() {
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (input: Parameters<typeof submitFriendLinkFn>[0]) => {
      return await submitFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.friend_links_toast_submit_duplicate());
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.mine });
      toast.success(m.friend_links_toast_submit_success(), {
        description: m.friend_links_toast_submit_success_desc(),
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
    mutationFn: async (input: Parameters<typeof createFriendLinkFn>[0]) => {
      return await createFriendLinkFn(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success(m.friend_links_toast_create_success());
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof updateFriendLinkFn>[0]) => {
      return await updateFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.friend_links_toast_update_not_found());
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success(m.friend_links_toast_update_success());
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (input: Parameters<typeof approveFriendLinkFn>[0]) => {
      return await approveFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.friend_links_toast_approve_not_found());
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success(m.friend_links_toast_approve_success());
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (input: Parameters<typeof rejectFriendLinkFn>[0]) => {
      return await rejectFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.friend_links_toast_reject_not_found());
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success(m.friend_links_toast_reject_success());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteFriendLinkFn>[0]) => {
      return await deleteFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.friend_links_toast_delete_not_found());
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success(m.friend_links_toast_delete_success());
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
