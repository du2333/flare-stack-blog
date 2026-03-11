import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Check, Hash, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  createTagFn,
  deleteTagFn,
  updateTagFn,
} from "@/features/tags/api/tags.api";
import {
  TAGS_KEYS,
  tagsWithCountAdminQueryOptions,
} from "@/features/tags/queries";
import type { CreateTagInput } from "@/features/tags/tags.schema";
import { CreateTagInputSchema } from "@/features/tags/tags.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function TagManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "postCount">(
    "postCount",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [tagToEdit, setTagToEdit] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery(
    tagsWithCountAdminQueryOptions({ sortBy, sortDir }),
  );

  const filteredTags = useMemo(() => {
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tags, searchTerm]);

  const updateTagMutation = useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      return await updateTagFn({
        data: { id: data.id, data: { name: data.name } },
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "TAG_NOT_FOUND":
            toast.error(m.tag_manager_not_found());
            return;
          case "TAG_NAME_ALREADY_EXISTS":
            toast.error(m.tag_manager_name_exists());
            return;
          default: {
            reason satisfies never;
            toast.error(m.tag_manager_unknown_error());
            return;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setTagToEdit(null);
      toast.success(m.tag_manager_renamed());
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteTagFn({ data: { id } });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.tag_manager_delete_fail());
        return;
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setTagToDelete(null);
      toast.success(m.tag_manager_deleted());
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      return await createTagFn({ data: { name } });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.tag_manager_name_exists());
        return;
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setIsCreating(false);
      toast.success(m.tag_manager_created());
    },
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            {m.tag_manager_title()}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              TAXONOMY MANAGEMENT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
              size={14}
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={m.tag_manager_search_placeholder()}
              className="pl-9 h-9 bg-transparent border-b border-border/50 rounded-none focus:border-foreground focus:ring-0 pr-0 transition-all font-mono text-xs"
            />
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="h-9 px-4 text-[10px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Hash size={12} />
            {m.tag_manager_new_tag()}
          </Button>
        </div>
      </div>

      {/* Stats/Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: m.tag_manager_stat_total(),
            value: tags.length,
            suffix: m.tag_manager_stat_unit(),
          },
          {
            label: m.tag_manager_stat_active(),
            value: tags.filter((t) => t.postCount > 0).length,
            suffix: m.tag_manager_stat_unit(),
          },
          {
            label: m.tag_manager_stat_empty(),
            value: tags.filter((t) => t.postCount === 0).length,
            suffix: m.tag_manager_stat_unit(),
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 border border-border/30 bg-background/50 hover:bg-accent/5 transition-colors group"
          >
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2 group-hover:text-foreground transition-colors">
              {stat.label}
            </div>
            <div className="text-3xl font-serif text-foreground">
              {stat.value}
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {stat.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Creation Row (Inline) */}
      {isCreating && (
        <InlineTagCreateForm
          isSubmitting={createTagMutation.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(name) => createTagMutation.mutate(name)}
        />
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-border/30 bg-background animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-accent rounded" />
                <div className="h-4 w-8 bg-accent rounded" />
              </div>
              <div className="h-3 w-32 bg-accent rounded" />
              <div className="flex justify-end gap-2 pt-2">
                <div className="h-6 w-12 bg-accent rounded" />
                <div className="h-6 w-12 bg-accent rounded" />
              </div>
            </div>
          ))
        ) : filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="p-4 border border-border/30 bg-background space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {tagToEdit?.id === tag.id ? (
                    <InlineTagEditForm
                      key={`mobile-${tag.id}`}
                      initialName={tag.name}
                      isSubmitting={updateTagMutation.isPending}
                      inputClassName="h-8 text-sm"
                      onCancel={() => setTagToEdit(null)}
                      onSubmit={(name) =>
                        updateTagMutation.mutate({ id: tag.id, name })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-muted-foreground/50" />
                      <span className="font-medium text-foreground">
                        {tag.name}
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {m.tag_manager_mobile_created()}{" "}
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {tag.postCount}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {m.tag_manager_mobile_posts()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => setTagToEdit({ id: tag.id, name: tag.name })}
                >
                  [ {m.tag_manager_edit()} ]
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-red-500"
                  onClick={() => setTagToDelete({ id: tag.id, name: tag.name })}
                >
                  [ {m.tag_manager_delete()} ]
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center border border-border/30 bg-background text-muted-foreground">
            <span className="text-xs font-serif italic">
              {m.tag_manager_no_match()}
            </span>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-background border border-border/30 rounded-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {m.tag_manager_col_name()}
                    <ArrowUpDown
                      size={10}
                      className={cn(sortBy === "name" && "text-foreground")}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button
                    onClick={() => toggleSort("postCount")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {m.tag_manager_col_posts()}
                    <ArrowUpDown
                      size={10}
                      className={cn(
                        sortBy === "postCount" && "text-foreground",
                      )}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal hidden lg:table-cell">
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {m.tag_manager_col_created()}
                    <ArrowUpDown
                      size={10}
                      className={cn(
                        sortBy === "createdAt" && "text-foreground",
                      )}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal text-right">
                  {m.tag_manager_col_actions()}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6">
                      <div className="h-4 w-32 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-12 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6 hidden lg:table-cell">
                      <div className="h-4 w-24 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-16 bg-accent rounded-none ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="group hover:bg-muted/5 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-medium">
                      {tagToEdit?.id === tag.id ? (
                        <InlineTagEditForm
                          key={`desktop-${tag.id}`}
                          initialName={tag.name}
                          isSubmitting={updateTagMutation.isPending}
                          inputClassName="h-7 py-0 text-sm border-0 border-b border-foreground rounded-none focus-visible:ring-0 px-1 bg-transparent"
                          onCancel={() => setTagToEdit(null)}
                          onSubmit={(name) =>
                            updateTagMutation.mutate({ id: tag.id, name })
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Hash
                            size={12}
                            className="text-muted-foreground/30"
                          />
                          <span className="text-foreground tracking-tight font-mono text-sm">
                            {tag.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {tag.postCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-muted-foreground/60 font-mono hidden lg:table-cell">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none"
                          onClick={() =>
                            setTagToEdit({ id: tag.id, name: tag.name })
                          }
                        >
                          [ {m.tag_manager_edit()} ]
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-none"
                          onClick={() =>
                            setTagToDelete({ id: tag.id, name: tag.name })
                          }
                        >
                          [ {m.tag_manager_delete()} ]
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center space-y-4">
                    <Search size={24} className="opacity-20 mx-auto" />
                    <div className="text-muted-foreground font-serif text-sm italic">
                      {m.tag_manager_no_match()}
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="text-[10px] uppercase tracking-widest h-auto p-0 text-muted-foreground hover:text-foreground"
                    >
                      [ {m.tag_manager_clear_search()} ]
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
      />
    </div>
  );
}

function InlineTagCreateForm({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const form = useForm<CreateTagInput>({
    resolver: standardSchemaResolver(CreateTagInputSchema),
    defaultValues: { name: "" },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const name = watch("name");

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data.name.trim()))}
      className="space-y-2 border border-border/30 bg-muted/5 p-4 animate-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono text-emerald-500 font-bold">
          {">"}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {m.tag_manager_inline_new()}
        </span>
        <div className="flex-1">
          <input
            autoFocus
            {...register("name")}
            placeholder={m.tag_manager_inline_placeholder()}
            className="w-full bg-transparent border-none outline-none font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={isSubmitting || !name.trim()}
            className="h-8 text-[10px] uppercase font-mono tracking-widest hover:text-emerald-500 hover:bg-emerald-500/10 rounded-none"
          >
            {isSubmitting
              ? m.tag_manager_inline_creating()
              : `[ ${m.tag_manager_inline_confirm()} ]`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-[10px] uppercase font-mono tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-none"
          >
            [ {m.tag_manager_inline_cancel()} ]
          </Button>
        </div>
      </div>
      {errors.name?.message && (
        <p className="pl-20 text-xs text-red-500">{errors.name.message}</p>
      )}
    </form>
  );
}

function InlineTagEditForm({
  initialName,
  isSubmitting,
  inputClassName,
  onCancel,
  onSubmit,
}: {
  initialName: string;
  isSubmitting: boolean;
  inputClassName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const form = useForm<CreateTagInput>({
    resolver: standardSchemaResolver(CreateTagInputSchema),
    defaultValues: { name: initialName },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const name = watch("name");

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data.name.trim()))}
      className="max-w-xs animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2">
        <Input autoFocus {...register("name")} className={inputClassName} />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={isSubmitting || !name.trim()}
          className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
        >
          <Check size={14} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        >
          <X size={14} />
        </Button>
      </div>
      {errors.name?.message && (
        <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
      )}
    </form>
  );
}
