import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TaxonomyNameDialog } from "@/components/admin/taxonomy-name-dialog";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export type CategoryEdit = {
  id: number | null;
  name: string;
  postCount: number;
  publicPostCount: number;
};
export function CategoryManager({
  editing,
  onClose,
  onCreated,
  fallbackFocus,
}: {
  editing: CategoryEdit | null;
  onClose: () => void;
  onCreated: (id: number) => void;
  fallbackFocus: () => HTMLElement | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<{ id: number; name: string } | null>(
    null,
  );
  useEffect(() => {
    if (editing) setName(editing.name);
  }, [editing]);
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.categories.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() }),
    ]);
  const createMutation = useMutation({
    mutationFn: (nextName: string) =>
      orpcClient.categories.admin.create({ name: nextName }),
    onSuccess: async (category) => {
      await invalidate();
      onClose();
      onCreated(category.id);
      toast.success(m.category_manager_created());
    },
    onError: (error) =>
      handleORPCError(error, {
        defined: {
          CATEGORY_NAME_ALREADY_EXISTS: () =>
            toast.error(m.category_manager_name_exists()),
        },
        fallback: () => toast.error(m.category_manager_unknown_error()),
      }),
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: number; name: string }) =>
      orpcClient.categories.admin.update({
        id: input.id,
        data: { name: input.name },
      }),
    onSuccess: async () => {
      await invalidate();
      onClose();
      toast.success(m.category_manager_renamed());
    },
    onError: (error) =>
      handleORPCError(error, {
        defined: {
          CATEGORY_NAME_ALREADY_EXISTS: () =>
            toast.error(m.category_manager_name_exists()),
          CATEGORY_NOT_FOUND: () => toast.error(m.category_manager_not_found()),
        },
        fallback: () => toast.error(m.category_manager_unknown_error()),
      }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpcClient.categories.admin.remove({ id }),
    onSuccess: async () => {
      await invalidate();
      setToDelete(null);
      onClose();
      toast.success(m.category_manager_deleted());
    },
    onError: () => toast.error(m.category_manager_unknown_error()),
  });
  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const save = () => {
    if (!editing || busy || !name.trim()) return;
    if (editing.id === null) createMutation.mutate(name.trim());
    else if (name.trim() === editing.name) onClose();
    else updateMutation.mutate({ id: editing.id, name: name.trim() });
  };
  return (
    <>
      <TaxonomyNameDialog
        open={editing !== null}
        title={
          editing?.id == null
            ? m.taxonomy_manager_create_category()
            : m.category_manager_rename()
        }
        name={name}
        onNameChange={setName}
        onClose={() => {
          if (!busy && !toDelete) onClose();
        }}
        onSave={save}
        busy={busy || toDelete !== null}
        submitLabel={
          editing?.id == null
            ? m.category_manager_create()
            : m.category_manager_save()
        }
        description={
          editing?.id != null
            ? m.taxonomy_usage_summary({
                current: editing.postCount,
                public: editing.publicPostCount,
              })
            : undefined
        }
        fallbackFocus={fallbackFocus}
        onDelete={
          editing?.id != null
            ? () => {
                if (editing?.id != null)
                  setToDelete({ id: editing.id, name: editing.name });
              }
            : undefined
        }
      />
      <ConfirmationModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete && !deleteMutation.isPending)
            deleteMutation.mutate(toDelete.id);
        }}
        title={m.category_manager_delete_title()}
        message={`${m.category_manager_delete_message({ name: toDelete?.name ?? "" })}${editing ? ` ${m.taxonomy_usage_summary({ current: editing.postCount, public: editing.publicPostCount })}` : ""}`}
        confirmLabel={m.category_manager_delete()}
        isLoading={deleteMutation.isPending}
        isDanger
        returnFocus={!editing ? fallbackFocus : undefined}
      />
    </>
  );
}
