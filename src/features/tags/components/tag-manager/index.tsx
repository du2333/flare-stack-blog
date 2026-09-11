import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TaxonomyNameDialog } from "@/components/admin/taxonomy-name-dialog";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export type EditingTag = {
  id: number;
  name: string;
  postCount: number;
  publicPostCount: number;
};
export function TagManager({
  editing,
  onClose,
  fallbackFocus,
}: {
  editing: EditingTag | null;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
}) {
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [draftName, setDraftName] = useState("");
  useEffect(() => {
    if (editing) setDraftName(editing.name);
  }, [editing]);
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.tags.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() }),
    ]);
  const updateTagMutation = useMutation({
    mutationFn: (data: { id: number; name: string }) =>
      orpcClient.tags.admin.update({ id: data.id, data: { name: data.name } }),
    onSuccess: async () => {
      await invalidate();
      onClose();
      toast.success(m.tag_manager_renamed());
    },
    onError: (error) =>
      handleORPCError(error, {
        defined: {
          TAG_NOT_FOUND: () => toast.error(m.tag_manager_not_found()),
          TAG_NAME_ALREADY_EXISTS: () =>
            toast.error(m.tag_manager_name_exists()),
        },
        fallback: () => toast.error(m.tag_manager_unknown_error()),
      }),
  });
  const deleteTagMutation = useMutation({
    mutationFn: (id: number) => orpcClient.tags.admin.remove({ id }),
    onSuccess: async () => {
      await invalidate();
      setTagToDelete(null);
      onClose();
      toast.success(m.tag_manager_deleted());
    },
    onError: () => toast.error(m.tag_manager_delete_fail()),
  });
  const closeEdit = () => {
    if (!updateTagMutation.isPending && !tagToDelete) onClose();
  };
  const saveEdit = () => {
    if (!editing || updateTagMutation.isPending || !draftName.trim()) return;
    if (draftName.trim() === editing.name) {
      onClose();
      return;
    }
    updateTagMutation.mutate({ id: editing.id, name: draftName.trim() });
  };
  return (
    <>
      <TaxonomyNameDialog
        open={editing !== null}
        title={m.tag_manager_edit_title()}
        name={draftName}
        onNameChange={setDraftName}
        onClose={closeEdit}
        onSave={saveEdit}
        busy={updateTagMutation.isPending || tagToDelete !== null}
        maxLength={50}
        description={
          editing
            ? m.taxonomy_usage_summary({
                current: editing.postCount,
                public: editing.publicPostCount,
              })
            : undefined
        }
        fallbackFocus={fallbackFocus}
        onDelete={() => {
          if (editing) setTagToDelete({ id: editing.id, name: editing.name });
        }}
      />
      <ConfirmationModal
        isOpen={tagToDelete !== null}
        onClose={() => setTagToDelete(null)}
        onConfirm={() => {
          if (tagToDelete && !deleteTagMutation.isPending)
            deleteTagMutation.mutate(tagToDelete.id);
        }}
        title={m.tag_manager_delete_title()}
        message={`${m.tag_manager_delete_desc({ tagName: tagToDelete?.name ?? "" })}${editing ? ` ${m.taxonomy_usage_summary({ current: editing.postCount, public: editing.publicPostCount })}` : ""}`}
        confirmLabel={m.tag_manager_delete_confirm()}
        isLoading={deleteTagMutation.isPending}
        isDanger
        returnFocus={!editing ? fallbackFocus : undefined}
      />
    </>
  );
}
