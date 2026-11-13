import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { TaxonomyNameDialog } from "@/components/admin/taxonomy-name-dialog";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

/** The editor's "new category" dialog; picks the category once it exists. */
export function CategoryCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);
  const createMutation = useMutation({
    mutationFn: (nextName: string) =>
      orpcClient.categories.admin.create({ name: nextName }),
    onSuccess: async (category) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.categories.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() }),
        queryClient.invalidateQueries({
          queryKey: orpc.posts.admin.list.key(),
        }),
      ]);
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
  const busy = createMutation.isPending;
  return (
    <TaxonomyNameDialog
      open={open}
      title={m.taxonomy_manager_create_category()}
      name={name}
      onNameChange={setName}
      onClose={() => {
        if (!busy) onClose();
      }}
      onSave={() => {
        if (!busy && name.trim()) createMutation.mutate(name.trim());
      }}
      busy={busy}
      maxLength={50}
      submitLabel={m.category_manager_create()}
    />
  );
}
