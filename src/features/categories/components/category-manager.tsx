import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { CategoryPanelSkeleton } from "@/components/admin/taxonomy-skeleton";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function CategoryManager() {
  const queryClient = useQueryClient();
  const { setPrimaryAction } = useAdminChrome();
  const createInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toDelete, setToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { data, isPending } = useQuery(categoriesAdminQueryOptions());
  const categories = data?.items ?? [];
  const uncategorizedPostCount = data?.uncategorizedPostCount ?? 0;

  useEffect(() => {
    setPrimaryAction({
      label: m.taxonomy_manager_create_category(),
      onClick: () => createInputRef.current?.focus(),
    });
    return () => setPrimaryAction(null);
  }, [setPrimaryAction]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.categories.key() });
    queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() });
  };

  const createMutation = useMutation({
    mutationFn: (nextName: string) =>
      orpcClient.categories.admin.create({ name: nextName }),
    onSuccess: () => {
      setName("");
      invalidate();
      toast.success(m.category_manager_created());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          CATEGORY_NAME_ALREADY_EXISTS: () => {
            toast.error(m.category_manager_name_exists());
          },
        },
        fallback: () => {
          toast.error(m.category_manager_unknown_error());
        },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: number; name: string }) =>
      orpcClient.categories.admin.update({
        id: input.id,
        data: { name: input.name },
      }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast.success(m.category_manager_renamed());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          CATEGORY_NAME_ALREADY_EXISTS: () => {
            toast.error(m.category_manager_name_exists());
          },
          CATEGORY_NOT_FOUND: () => {
            toast.error(m.category_manager_not_found());
          },
        },
        fallback: () => {
          toast.error(m.category_manager_unknown_error());
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpcClient.categories.admin.remove({ id }),
    onSuccess: () => {
      setToDelete(null);
      invalidate();
      toast.success(m.category_manager_deleted());
    },
  });

  const submitCreate = () => {
    const next = name.trim();
    if (!next || createMutation.isPending) return;
    createMutation.mutate(next);
  };

  const createForm = (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submitCreate();
      }}
    >
      <input
        ref={createInputRef}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={m.category_manager_create_placeholder()}
        className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm fuwari-text-90 outline-none"
      />
      <button
        type="submit"
        disabled={!name.trim() || createMutation.isPending}
        className="fuwari-btn-primary rounded-xl h-10 px-4 text-sm font-medium"
      >
        {m.category_manager_create()}
      </button>
    </form>
  );

  const uncategorizedRow = (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3">
      <BookOpen
        size={16}
        strokeWidth={1.5}
        className="shrink-0 text-(--fuwari-btn-content)"
      />
      <span className="flex-1 min-w-0 truncate text-sm fuwari-text-50">
        {m.post_uncategorized()}
      </span>
      <span className="text-xs fuwari-text-50 shrink-0">
        {m.category_manager_post_count({ count: uncategorizedPostCount })}
      </span>
    </div>
  );

  if (isPending) {
    return <CategoryPanelSkeleton />;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-sm font-medium fuwari-text-50">
          {m.category_manager_title()}
        </h2>
        <span className="text-xs fuwari-text-50">
          {m.category_manager_heading_count({ count: categories.length })}
        </span>
      </div>

      {categories.length === 0 ? (
        <>
          <div className="px-1 py-8 text-center space-y-4">
            <p className="text-sm fuwari-text-50">
              {m.category_manager_empty()}
            </p>
            <div className="max-w-[420px] mx-auto text-left">{createForm}</div>
          </div>
          <div className="h-px mx-3 bg-(--fuwari-input-border)" />
          {uncategorizedRow}
        </>
      ) : (
        <>
          {createForm}
          <ul>
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-(--fuwari-btn-regular-bg)"
              >
                {editingId === category.id ? (
                  <form
                    className="flex-1 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const next = editingName.trim();
                      if (!next) return;
                      updateMutation.mutate({ id: category.id, name: next });
                    }}
                  >
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="flex-1 h-9 px-3 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm outline-none"
                    />
                    <button
                      type="submit"
                      className="text-sm text-(--fuwari-primary)"
                    >
                      {m.category_manager_save()}
                    </button>
                    <button
                      type="button"
                      className="text-sm fuwari-text-50"
                      onClick={() => setEditingId(null)}
                    >
                      {m.category_manager_cancel()}
                    </button>
                  </form>
                ) : (
                  <>
                    <BookOpen
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 text-(--fuwari-btn-content)"
                    />
                    <span className="flex-1 min-w-0 truncate text-sm fuwari-text-90">
                      {category.name}
                    </span>
                    <span className="text-xs fuwari-text-50 shrink-0">
                      {m.category_manager_post_count({
                        count: category.postCount,
                      })}
                    </span>
                    <button
                      type="button"
                      className="text-sm fuwari-text-50 hover:text-(--fuwari-primary)"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    >
                      {m.category_manager_rename()}
                    </button>
                    <button
                      type="button"
                      className="text-sm fuwari-text-50 hover:text-(--fuwari-danger-fg)"
                      onClick={() =>
                        setToDelete({ id: category.id, name: category.name })
                      }
                    >
                      {m.category_manager_delete()}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="h-px mx-3 bg-(--fuwari-input-border)" />
          {uncategorizedRow}
        </>
      )}

      <ConfirmationModal
        isOpen={toDelete != null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id);
        }}
        title={m.category_manager_delete_title()}
        message={m.category_manager_delete_message({
          name: toDelete?.name ?? "",
        })}
        confirmLabel={m.category_manager_delete()}
        isLoading={deleteMutation.isPending}
        isDanger
      />
    </section>
  );
}
