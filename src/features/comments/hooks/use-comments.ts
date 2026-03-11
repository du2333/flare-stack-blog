import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COMMENTS_KEYS } from "@/features/comments/queries";
import { m } from "@/paraglide/messages";
import {
  adminDeleteCommentFn,
  moderateCommentFn,
} from "../api/comments.admin.api";
import { createCommentFn, deleteCommentFn } from "../api/comments.public.api";

export function useComments(postId?: number) {
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createCommentFn>[0]) => {
      return await createCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "ROOT_COMMENT_NOT_FOUND":
          case "REPLY_TO_COMMENT_NOT_FOUND":
            toast.error(m.comments_toast_deleted_refresh());
            return;
          case "INVALID_ROOT_ID":
          case "ROOT_COMMENT_POST_MISMATCH":
          case "REPLY_TO_COMMENT_ROOT_MISMATCH":
          case "ROOT_COMMENT_CANNOT_HAVE_REPLY_TO":
            toast.error(m.comments_toast_structure_error());
            return;
          default: {
            reason satisfies never;
            toast.error(m.comments_toast_unknown_error());
            return;
          }
        }
      }

      // Invalidate both root comments and all replies queries for this post
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.roots(postId),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.repliesLists(postId),
          exact: false,
        });
      }
      // Also invalidate admin view queries
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.admin,
        exact: false,
      });
      // Also invalidate user's own comments list
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.mine,
        exact: false,
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteCommentFn>[0]) => {
      return await deleteCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "COMMENT_NOT_FOUND":
            toast.error(m.comments_toast_delete_not_found());
            return;
          case "PERMISSION_DENIED":
            toast.error(m.comments_toast_delete_denied());
            return;
          default: {
            reason satisfies never;
            toast.error(m.comments_toast_delete_error());
            return;
          }
        }
      }

      // Invalidate both root comments and all replies queries for this post
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.roots(postId),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.repliesLists(postId),
          exact: false,
        });
      }
      // NEW: Also invalidate admin view queries
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.admin,
        exact: false,
      });
      // Also invalidate user's own comments list
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.mine,
        exact: false,
      });
      toast.success(m.comments_toast_delete_success());
    },
  });

  return {
    createComment: createCommentMutation.mutateAsync,
    isCreating: createCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeleting: deleteCommentMutation.isPending,
  };
}

export function useAdminComments() {
  const queryClient = useQueryClient();

  const moderateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof moderateCommentFn>[0]) => {
      return await moderateCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.comments_toast_moderate_not_found());
        return;
      }

      // Invalidate all comment related queries to be safe since moderation
      // affects visibility in both admin and public views
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
      toast.success(m.comments_toast_moderate_success());
    },
  });

  const adminDeleteMutation = useMutation({
    mutationFn: async (input: Parameters<typeof adminDeleteCommentFn>[0]) => {
      return await adminDeleteCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.comments_toast_destroy_not_found());
        return;
      }

      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
      toast.success(m.comments_toast_destroy_success());
    },
  });

  return {
    moderate: moderateMutation.mutate,
    moderateAsync: moderateMutation.mutateAsync,
    isModerating: moderateMutation.isPending,
    adminDelete: adminDeleteMutation.mutate,
    isAdminDeleting: adminDeleteMutation.isPending,
  };
}
