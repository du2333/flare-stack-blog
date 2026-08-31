import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { TagPanelSkeleton } from "@/components/admin/taxonomy-skeleton";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function TagManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [editing, setEditing] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: tags = [], isPending } = useQuery(
    tagsWithCountAdminQueryOptions(),
  );

  const filteredTags = useMemo(() => {
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tags, searchTerm]);

  const unusedCount = tags.filter((tag) => tag.postCount === 0).length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.tags.admin.key() });
  };

  const updateTagMutation = useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      return await orpcClient.tags.admin.update({
        id: data.id,
        data: { name: data.name },
      });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success(m.tag_manager_renamed());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          TAG_NOT_FOUND: () => {
            toast.error(m.tag_manager_not_found());
          },
          TAG_NAME_ALREADY_EXISTS: () => {
            toast.error(m.tag_manager_name_exists());
          },
        },
        fallback: () => {
          toast.error(m.tag_manager_unknown_error());
        },
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return await orpcClient.tags.admin.remove({ id });
    },
    onSuccess: () => {
      invalidate();
      setTagToDelete(null);
      toast.success(m.tag_manager_deleted());
    },
    onError: () => {
      toast.error(m.tag_manager_delete_fail());
    },
  });

  if (isPending) {
    return <TagPanelSkeleton />;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-sm font-medium fuwari-text-50">
          {m.tag_manager_title()}
        </h2>
        <span className="text-xs fuwari-text-50">
          {m.tag_manager_unused_meta({ count: unusedCount })}
        </span>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 fuwari-text-50"
          size={16}
          strokeWidth={1.5}
        />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={m.tag_manager_search_placeholder()}
          className="w-full h-10 pl-10 pr-10 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm fuwari-text-90 outline-none"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
            aria-label={m.tag_manager_clear_search()}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {filteredTags.length === 0 ? (
        <p className="text-sm fuwari-text-50 px-1 py-6">
          {tags.length === 0 ? m.tag_manager_empty() : m.tag_manager_no_match()}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) => {
            const unused = tag.postCount === 0;
            const isEditing = editing?.id === tag.id;

            if (isEditing) {
              return (
                <form
                  key={tag.id}
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const next = editing.name.trim();
                    if (!next) return;
                    updateTagMutation.mutate({ id: tag.id, name: next });
                  }}
                >
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(event) =>
                      setEditing({ id: tag.id, name: event.target.value })
                    }
                    className="h-9 w-36 px-3 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm outline-none"
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
                    onClick={() => setEditing(null)}
                  >
                    {m.category_manager_cancel()}
                  </button>
                  <button
                    type="button"
                    className="text-sm fuwari-text-50 hover:text-(--fuwari-danger-fg)"
                    onClick={() => {
                      setTagToDelete({ id: tag.id, name: tag.name });
                      setEditing(null);
                    }}
                  >
                    {m.tag_manager_delete()}
                  </button>
                </form>
              );
            }

            return (
              <span
                key={tag.id}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 pl-3 rounded-full text-sm font-medium",
                  unused
                    ? "bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) pr-1.5"
                    : "bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) pr-3",
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => setEditing({ id: tag.id, name: tag.name })}
                >
                  {tag.name}
                  <span
                    className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[11px] grid place-items-center",
                      unused
                        ? "bg-transparent text-(--fuwari-warning-fg)"
                        : "bg-(--fuwari-primary) text-white",
                    )}
                  >
                    {tag.postCount}
                  </span>
                </button>
                {unused ? (
                  <button
                    type="button"
                    className="w-[18px] h-[18px] grid place-items-center rounded-full"
                    aria-label={m.tag_manager_delete()}
                    onClick={() =>
                      setTagToDelete({ id: tag.id, name: tag.name })
                    }
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={() =>
          tagToDelete && deleteTagMutation.mutate(tagToDelete.id)
        }
        title={m.tag_manager_delete_title()}
        message={
          tagToDelete
            ? m.tag_manager_delete_desc({ tagName: tagToDelete.name })
            : ""
        }
        confirmLabel={m.tag_manager_delete_confirm()}
        isLoading={deleteTagMutation.isPending}
        isDanger
      />
    </section>
  );
}
