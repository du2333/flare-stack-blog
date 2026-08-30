import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  postRevisionDetailQuery,
  postRevisionListQuery,
} from "@/features/posts/queries";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import type { PostEditorCover } from "../types";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import {
  getDeleteErrorMessage,
  getRestoreErrorMessage,
  type RevisionDetail,
} from "../post-editor-history.shared";

function invalidatePostEditorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number,
) {
  const queryKeys = [
    orpc.posts.admin.get.key({ input: { id: postId } }),
    orpc.posts.list.key(),
    orpc.posts.admin.list.key(),
    orpc.posts.admin.revisions.key(),
    orpc.tags.admin.key(),
    orpc.categories.key(),
    orpc.media.linkedKeys.key(),
  ];

  return Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
}

export function usePostHistory({
  postId,
  isInspecting,
  onInspectingChange,
  onRestoreApplied,
  beforeRestore,
}: {
  postId: number;
  isInspecting: boolean;
  onInspectingChange: (isInspecting: boolean) => void;
  onRestoreApplied: (
    snapshot: PostRevisionSnapshot,
    cover: PostEditorCover | null,
  ) => void;
  beforeRestore?: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(
    null,
  );
  const [confirm, setConfirm] = useState<null | "restore" | "delete">(null);

  const revisionsQuery = useQuery({
    ...postRevisionListQuery(postId),
    enabled: isInspecting,
    refetchOnMount: "always",
  });

  const selectedRevisionQuery = useQuery({
    ...postRevisionDetailQuery(postId, selectedRevisionId ?? 0),
    enabled: isInspecting && selectedRevisionId != null,
    refetchOnMount: "always",
  });

  const selectedRevision: RevisionDetail | null =
    selectedRevisionQuery.data ?? null;

  useEffect(() => {
    if (!isInspecting) return;

    const revisions = revisionsQuery.data ?? [];
    if (revisions.length === 0) {
      setSelectedRevisionId(null);
      return;
    }

    const hasSelected = revisions.some(
      (revision) => revision.id === selectedRevisionId,
    );
    if (!hasSelected) {
      setSelectedRevisionId(revisions[0]?.id ?? null);
    }
  }, [isInspecting, revisionsQuery.data, selectedRevisionId]);

  const openHistory = () => {
    onInspectingChange(true);
  };

  const exitInspect = () => {
    setConfirm(null);
    onInspectingChange(false);
  };

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (selectedRevisionId == null) {
        throw new Error("REVISION_NOT_SELECTED");
      }

      await beforeRestore?.();

      await orpcClient.posts.admin.revisions.restore({
        postId,
        revisionId: selectedRevisionId,
      });
    },
    onSuccess: async () => {
      if (!selectedRevision) return;

      const fresh = await orpcClient.posts.admin.get({ id: postId });
      onRestoreApplied(selectedRevision.snapshotJson, fresh?.cover ?? null);

      await invalidatePostEditorQueries(queryClient, postId);

      const title =
        selectedRevision.snapshotJson.title.trim() || m.common_untitled();
      toast.success(m.editor_history_toast_restore_success(), {
        description: m.editor_history_toast_restore_success_desc({
          title,
        }),
      });

      setConfirm(null);
      onInspectingChange(false);
    },
    onError: (error) => {
      toast.error(m.editor_history_toast_restore_failed(), {
        description: getRestoreErrorMessage(error.message),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedRevisionId == null) {
        throw new Error("REVISION_NOT_SELECTED");
      }

      return await orpcClient.posts.admin.revisions.remove({
        postId,
        revisionIds: [selectedRevisionId],
      });
    },
    onSuccess: async (result) => {
      const deletedCurrentRevision =
        selectedRevisionId != null &&
        result.deletedIds.includes(selectedRevisionId);

      if (deletedCurrentRevision) {
        setSelectedRevisionId(null);
      }

      await invalidatePostEditorQueries(queryClient, postId);

      toast.success(m.editor_history_toast_delete_success(), {
        description: m.editor_history_toast_delete_success_desc(),
      });

      setConfirm(null);
    },
    onError: (error) => {
      toast.error(m.editor_history_toast_delete_failed(), {
        description: getDeleteErrorMessage(error.message),
      });
    },
  });

  return {
    isInspecting,
    revisions: revisionsQuery.data ?? [],
    isListLoading: revisionsQuery.isLoading,
    selectedRevisionId,
    selectedRevision,
    isRevisionLoading: selectedRevisionQuery.isLoading,
    isRestoring: restoreMutation.isPending,
    isDeleting: deleteMutation.isPending,
    confirm,
    openHistory,
    exitInspect,
    selectRevision: setSelectedRevisionId,
    requestRestore: () => {
      if (selectedRevisionId == null) return;
      setConfirm("restore");
    },
    requestDelete: () => {
      if (selectedRevisionId == null) return;
      setConfirm("delete");
    },
    cancelConfirm: () => setConfirm(null),
    confirmRestore: () => restoreMutation.mutate(),
    confirmDelete: () => deleteMutation.mutate(),
  };
}
