import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type {
  CreateCommentInput,
  DeleteCommentInput,
} from "../comments.schema";

function invalidateCommentViews(
  queryClient: ReturnType<typeof useQueryClient>,
  postId?: number,
) {
  if (postId) {
    queryClient.invalidateQueries({
      queryKey: orpc.comments.roots.key({ input: { postId } }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.comments.replies.key({ input: { postId } }),
    });
  }
  queryClient.invalidateQueries({
    queryKey: orpc.comments.mine.key(),
  });
}

export function useComments(postId?: number) {
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: (input: CreateCommentInput) =>
      orpcClient.comments.create(input),
    onSuccess: () => {
      invalidateCommentViews(queryClient, postId);
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          ROOT_COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_deleted_refresh());
          },
          REPLY_TO_COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_deleted_refresh());
          },
          INVALID_ROOT_ID: () => {
            toast.error(m.comments_toast_structure_error());
          },
          ROOT_COMMENT_POST_MISMATCH: () => {
            toast.error(m.comments_toast_structure_error());
          },
          REPLY_TO_COMMENT_ROOT_MISMATCH: () => {
            toast.error(m.comments_toast_structure_error());
          },
          ROOT_COMMENT_CANNOT_HAVE_REPLY_TO: () => {
            toast.error(m.comments_toast_structure_error());
          },
          POST_NOT_PUBLISHED: () => {
            toast.error(m.comments_toast_unknown_error());
          },
          POST_NOT_FOUND: () => {
            toast.error(m.comments_toast_unknown_error());
          },
        },
        fallback: () => {
          toast.error(m.comments_toast_unknown_error());
        },
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (input: DeleteCommentInput) =>
      orpcClient.comments.remove(input),
    onSuccess: () => {
      invalidateCommentViews(queryClient, postId);
      toast.success(m.comments_toast_delete_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_delete_not_found());
          },
          FORBIDDEN: () => {
            toast.error(m.comments_toast_delete_denied());
          },
        },
        fallback: () => {
          toast.error(m.comments_toast_delete_error());
        },
      });
    },
  });

  return {
    createComment: createCommentMutation.mutateAsync,
    isCreating: createCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeleting: deleteCommentMutation.isPending,
  };
}
