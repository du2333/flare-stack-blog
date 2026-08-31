import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { TagPanelSkeleton } from "@/components/admin/taxonomy-skeleton";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type EditingTag = {
  id: number;
  name: string;
  postCount: number;
};

export function TagManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [editing, setEditing] = useState<EditingTag | null>(null);
  const [draftName, setDraftName] = useState("");

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

  const openEdit = (tag: EditingTag) => {
    setEditing(tag);
    setDraftName(tag.name);
  };

  const closeEdit = () => {
    if (updateTagMutation.isPending) return;
    setEditing(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    const next = draftName.trim();
    if (!next) return;
    if (next === editing.name) {
      setEditing(null);
      return;
    }
    updateTagMutation.mutate({ id: editing.id, name: next });
  };

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
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  openEdit({
                    id: tag.id,
                    name: tag.name,
                    postCount: tag.postCount,
                  })
                }
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full pl-3.5 pr-3 text-sm font-medium",
                  unused
                    ? "bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg)"
                    : "bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)",
                )}
              >
                <span className="max-w-40 truncate">{tag.name}</span>
                <span
                  className={cn(
                    "min-w-[18px] h-[18px] px-1 rounded-full text-[11px] grid place-items-center leading-none",
                    unused
                      ? "bg-transparent text-(--fuwari-warning-fg)"
                      : "bg-(--fuwari-primary) text-white",
                  )}
                >
                  {tag.postCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <TagEditDialog
        tag={editing}
        name={draftName}
        onNameChange={setDraftName}
        isSaving={updateTagMutation.isPending}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={() => {
          if (!editing) return;
          setTagToDelete({ id: editing.id, name: editing.name });
          setEditing(null);
        }}
      />

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

function TagEditForm({
  tag,
  name,
  onNameChange,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: {
  tag: EditingTag | null;
  name: string;
  onNameChange: (name: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="text-sm fuwari-text-50">
        {tag && tag.postCount > 0
          ? m.category_manager_post_count({ count: tag.postCount })
          : m.tag_manager_unused_hint()}
      </p>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        autoFocus
        className="mt-4 h-11 w-full rounded-xl bg-(--fuwari-btn-regular-bg) px-3 text-sm fuwari-text-90 outline-none"
      />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={isSaving}
          className="h-11 rounded-xl text-sm font-medium text-(--fuwari-danger-fg) disabled:opacity-50"
        >
          {m.tag_manager_delete()}
        </button>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="fuwari-btn-primary h-11 rounded-xl text-sm font-medium gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          {m.category_manager_save()}
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="mt-2 h-11 w-full rounded-xl text-sm fuwari-text-50 disabled:opacity-50"
      >
        {m.category_manager_cancel()}
      </button>
    </form>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

function TagEditDialog(props: {
  tag: EditingTag | null;
  name: string;
  onNameChange: (name: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <ClientOnly>
      <TagEditSurfaces {...props} />
    </ClientOnly>
  );
}

function TagEditSurfaces({
  tag,
  name,
  onNameChange,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: {
  tag: EditingTag | null;
  name: string;
  onNameChange: (name: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const open = tag != null;
  const desktop = useIsDesktop();
  const form = (
    <TagEditForm
      tag={tag}
      name={name}
      onNameChange={onNameChange}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );

  useEffect(() => {
    if (!open || isSaving || !desktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [desktop, open, isSaving, onClose]);

  if (!desktop) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={m.tag_manager_edit_title()}
        preventClose={isSaving}
      >
        {form}
      </BottomSheet>
    );
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-100 flex items-center justify-center p-4 transition-opacity duration-200",
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-edit-title"
        className={cn(
          "relative w-full max-w-[420px] fuwari-card-base p-6 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <h2 id="tag-edit-title" className="text-lg font-medium fuwari-text-90">
          {m.tag_manager_edit_title()}
        </h2>
        <div className="mt-1">{form}</div>
      </div>
    </div>,
    document.body,
  );
}
