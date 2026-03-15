import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { MEDIA_KEYS } from "@/features/media/queries";
import {
  deletePostRevisionsFn,
  restorePostRevisionFn,
} from "@/features/posts/api/post-revisions.admin.api";
import {
  POSTS_KEYS,
  postRevisionDetailQuery,
  postRevisionListQuery,
} from "@/features/posts/queries";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { TAGS_KEYS } from "@/features/tags/queries";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  getDeleteErrorMessage,
  getRestoreErrorMessage,
  HISTORY_POLL_INTERVAL_MS,
  HISTORY_POLL_WINDOW_MS,
  type RevisionDetail,
} from "./post-editor-history.shared";
import { PostEditorHistoryList } from "./post-editor-history-list";
import { PostEditorHistoryPreview } from "./post-editor-history-preview";

interface PostEditorHistoryPanelProps {
  postId: number;
  isOpen: boolean;
  onClose: () => void;
  allTags: Array<{ id: number; name: string }>;
  onRestoreApplied: (input: { snapshot: PostRevisionSnapshot }) => void;
}

function invalidatePostEditorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number,
) {
  const queryKeys = [
    POSTS_KEYS.detail(postId),
    POSTS_KEYS.lists,
    POSTS_KEYS.adminLists,
    POSTS_KEYS.counts,
    POSTS_KEYS.revisionList(postId),
    POSTS_KEYS.revisionDetails,
    TAGS_KEYS.postTags(postId),
    TAGS_KEYS.admin,
    MEDIA_KEYS.linked,
  ] as const;

  return Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
}

function HistoryPanelInternal({
  postId,
  isOpen,
  onClose,
  allTags,
  onRestoreApplied,
}: PostEditorHistoryPanelProps) {
  const queryClient = useQueryClient();
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(
    null,
  );
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<Array<number>>(
    [],
  );
  const [isMobilePreviewing, setIsMobilePreviewing] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [deleteTargetRevisionIds, setDeleteTargetRevisionIds] = useState<
    Array<number>
  >([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPollWindowActive, setIsPollWindowActive] = useState(false);

  const handleSelectRevision = (id: number) => {
    setSelectedRevisionId(id);
    setIsMobilePreviewing(true);
  };

  const revisionsQuery = useQuery({
    ...postRevisionListQuery(postId),
    enabled: isOpen,
    refetchOnMount: "always",
    refetchInterval:
      isOpen && isPollWindowActive ? HISTORY_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  const selectedRevisionQuery = useQuery({
    ...postRevisionDetailQuery(postId, selectedRevisionId ?? 0),
    enabled: isOpen && selectedRevisionId != null,
    refetchOnMount: "always",
    refetchIntervalInBackground: false,
  });

  const selectedRevision: RevisionDetail | null =
    selectedRevisionQuery.data ?? null;
  const refetchRevisions = revisionsQuery.refetch;
  const refetchSelectedRevision = selectedRevisionQuery.refetch;

  useEffect(() => {
    if (!isOpen) {
      setIsPollWindowActive(false);
      setIsMobilePreviewing(false); // Reset mobile view when closed
      setSelectedRevisionIds([]);
      return;
    }

    setIsPollWindowActive(true);
    void refetchRevisions();
    if (selectedRevisionId != null) {
      void refetchSelectedRevision();
    }

    const timer = setTimeout(() => {
      setIsPollWindowActive(false);
    }, HISTORY_POLL_WINDOW_MS);

    return () => {
      clearTimeout(timer);
      setIsPollWindowActive(false);
    };
  }, [isOpen, refetchRevisions, selectedRevisionId, refetchSelectedRevision]);

  useEffect(() => {
    if (!isOpen) return;

    const revisions = revisionsQuery.data ?? [];
    const revisionIds = revisions.map((revision) => revision.id);
    setSelectedRevisionIds((current) =>
      current.filter((revisionId) => revisionIds.includes(revisionId)),
    );

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
  }, [isOpen, revisionsQuery.data, selectedRevisionId]);

  const handleToggleRevisionSelection = (
    revisionId: number,
    checked: boolean,
  ) => {
    setSelectedRevisionIds((current) => {
      if (checked) {
        return current.includes(revisionId)
          ? current
          : [...current, revisionId];
      }

      return current.filter((id) => id !== revisionId);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const revisions = revisionsQuery.data ?? [];
    setSelectedRevisionIds(
      checked ? revisions.map((revision) => revision.id) : [],
    );
  };

  const openDeleteConfirmation = (revisionIds: Array<number>) => {
    if (revisionIds.length === 0) return;
    setDeleteTargetRevisionIds([...new Set(revisionIds)]);
    setIsDeleteConfirmOpen(true);
  };

  const tagNames = useMemo(() => {
    if (!selectedRevision) return [];
    const tagMap = new Map(allTags.map((tag) => [tag.id, tag.name]));
    return selectedRevision.snapshotJson.tagIds
      .map((tagId) => tagMap.get(tagId))
      .filter((tagName): tagName is string => Boolean(tagName));
  }, [allTags, selectedRevision]);

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRevisionId) {
        throw new Error("REVISION_NOT_SELECTED");
      }

      const result = await restorePostRevisionFn({
        data: { postId, revisionId: selectedRevisionId },
      });

      if (result.error) {
        throw new Error(result.error.reason);
      }
    },
    onSuccess: async () => {
      if (!selectedRevision) return;

      onRestoreApplied({
        snapshot: selectedRevision.snapshotJson,
      });

      await invalidatePostEditorQueries(queryClient, postId);

      const title =
        selectedRevision.snapshotJson.title.trim() || m.common_untitled();
      toast.success(m.editor_history_toast_restore_success(), {
        description: m.editor_history_toast_restore_success_desc({
          title,
        }),
      });

      setIsRestoreConfirmOpen(false);
      onClose();
    },
    onError: (error) => {
      toast.error(m.editor_history_toast_restore_failed(), {
        description: getRestoreErrorMessage(error.message),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (revisionIds: Array<number>) => {
      const result = await deletePostRevisionsFn({
        data: { postId, revisionIds },
      });

      if (!result.data) {
        throw new Error("DELETE_FAILED");
      }

      return result.data;
    },
    onSuccess: async (result) => {
      const deletedCurrentRevision =
        selectedRevisionId != null &&
        result.deletedIds.includes(selectedRevisionId);

      if (deletedCurrentRevision) {
        setSelectedRevisionId(null);
        setIsMobilePreviewing(false);
      }

      await invalidatePostEditorQueries(queryClient, postId);

      setSelectedRevisionIds((current) =>
        current.filter((id) => !result.deletedIds.includes(id)),
      );

      toast.success(m.editor_history_toast_delete_success(), {
        description: m.editor_history_toast_delete_success_desc({
          count: String(result.deletedCount),
        }),
      });

      setDeleteTargetRevisionIds([]);
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(m.editor_history_toast_delete_failed(), {
        description: getDeleteErrorMessage(error.message),
      });
    },
  });

  // Use established hook for exit animation lifecycle
  const shouldRender = useDelayUnmount(isOpen, 500);

  if (!shouldRender) return null;

  return (
    <>
      <ConfirmationModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        onConfirm={() => restoreMutation.mutate()}
        title={m.editor_history_restore_title()}
        message={m.editor_history_restore_message({
          time: selectedRevision
            ? formatDate(selectedRevision.createdAt, { includeTime: true })
            : "",
        })}
        confirmLabel={m.editor_history_restore_action()}
        isLoading={restoreMutation.isPending}
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setIsDeleteConfirmOpen(false);
          setDeleteTargetRevisionIds([]);
        }}
        onConfirm={() => deleteMutation.mutate(deleteTargetRevisionIds)}
        title={m.editor_history_delete_title()}
        message={m.editor_history_delete_message({
          count: String(deleteTargetRevisionIds.length),
        })}
        confirmLabel={m.editor_history_delete_action()}
        isLoading={deleteMutation.isPending}
        isDanger
      />

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-90 bg-background/50 backdrop-blur-sm transition-all duration-500",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-91 flex w-full max-w-full flex-col border-l border-border/40 bg-background/95 shadow-2xl backdrop-blur lg:max-w-[85vw] duration-500",
          isOpen
            ? "animate-in fade-in slide-in-from-right"
            : "animate-out fade-out slide-out-to-right fill-mode-forwards",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-5">
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground/60">
              {m.editor_history_eyebrow()}
            </p>
            <h2 className="text-2xl font-serif text-foreground">
              {m.editor_history_title()}
            </h2>
            <p className="text-sm text-muted-foreground/70">
              {m.editor_history_subtitle()}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-none text-muted-foreground hover:text-foreground"
            aria-label={m.common_close()}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isMobilePreviewing ? "hidden lg:flex" : "flex",
            )}
          >
            <PostEditorHistoryList
              revisions={revisionsQuery.data ?? []}
              isLoading={revisionsQuery.isLoading}
              selectedRevisionId={selectedRevisionId}
              selectedRevisionIds={selectedRevisionIds}
              isDeleting={deleteMutation.isPending}
              onSelect={handleSelectRevision}
              onToggleSelection={handleToggleRevisionSelection}
              onToggleSelectAll={handleToggleSelectAll}
              onDeleteSelected={() =>
                openDeleteConfirmation(selectedRevisionIds)
              }
            />
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              !isMobilePreviewing ? "hidden lg:flex" : "flex",
            )}
          >
            <PostEditorHistoryPreview
              revision={selectedRevision}
              tagNames={tagNames}
              isLoading={selectedRevisionQuery.isLoading}
              isRestoring={restoreMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onRestore={() => setIsRestoreConfirmOpen(true)}
              onDelete={() =>
                selectedRevision
                  ? openDeleteConfirmation([selectedRevision.id])
                  : undefined
              }
              onBack={() => setIsMobilePreviewing(false)}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

export function PostEditorHistoryPanel(props: PostEditorHistoryPanelProps) {
  return (
    <ClientOnly>
      <HistoryPanelInternal {...props} />
    </ClientOnly>
  );
}
