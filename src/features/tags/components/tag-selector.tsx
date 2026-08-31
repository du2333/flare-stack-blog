import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hash, Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { orpcClient } from "@/lib/orpc";
import type { Tag } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface TagSelectorProps {
  value: Array<number>;
  onChange: (value: Array<number>) => void;
  disabled?: boolean;
}

export function TagSelector({
  value = [],
  onChange,
  disabled,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const queryClient = useQueryClient();
  const adminTagsQuery = tagsAdminQueryOptions();
  const adminTagsQueryKey = adminTagsQuery.queryKey;

  // Use admin query options (Infinity staleTime)
  const {
    data: tags = [],
    isLoading: isTagsLoading,
    isError,
  } = useQuery(adminTagsQuery);

  // Strict optimistic update following TanStack Query best practices
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => orpcClient.tags.admin.create({ name }),

    // When mutate is called (BEFORE the request)
    onMutate: async (newTagName) => {
      // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: adminTagsQueryKey,
      });

      // 2. Snapshot the previous value for rollback
      const previousTags =
        queryClient.getQueryData<Array<Tag>>(adminTagsQueryKey);

      // 3. Optimistically update the cache with a temporary tag
      const tempId = -Math.round(Math.random() * 1000000); // Random negative ID
      const optimisticTag: Tag = {
        id: tempId,
        name: newTagName,
        createdAt: new Date(),
      };

      queryClient.setQueryData(
        adminTagsQueryKey,
        (old: Array<Tag> | undefined) => {
          if (!old) return [optimisticTag];
          return [...old, optimisticTag].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        },
      );

      // 4. Update selection with optimistic ID immediately
      // This makes it feel instant to the user
      onChange([...valueRef.current, optimisticTag.id]);
      setSearchTerm("");

      // Return context with snapshot and tempId
      return { previousTags, optimisticTagId: optimisticTag.id };
    },

    // If mutation succeeds, we need to swap the optimistic ID with the real ID
    onSuccess: (newTag, _variables, context) => {
      // 1. Update the cache to replace the temp tag with the real one
      queryClient.setQueryData(
        adminTagsQueryKey,
        (old: Array<Tag> | undefined) => {
          if (!old) return [newTag];
          return old
            .map((t) => (t.id === context.optimisticTagId ? newTag : t))
            .sort((a, b) => a.name.localeCompare(b.name));
        },
      );

      // 2. Update the parent selection to swap ID
      // This loop is critical to prevent "flicker" or losing selection
      onChange(
        valueRef.current.map((id) =>
          id === context.optimisticTagId ? newTag.id : id,
        ),
      );
    },

    // Always refetch after error or success for consistency
    onError: (_error, _newTagName, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(adminTagsQueryKey, context.previousTags);
      }
      if (context?.optimisticTagId) {
        onChange(
          valueRef.current.filter((id) => id !== context.optimisticTagId),
        );
      }
      toast.error(m.tag_selector_create_fail(), {
        description: m.tag_selector_create_fail_desc(),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: adminTagsQueryKey,
      });
    },
  });

  const selectedTags = useMemo(
    () => tags.filter((tag) => value.includes(tag.id)),
    [tags, value],
  );

  const availableTags = useMemo(
    () =>
      tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [tags, searchTerm],
  );

  const toggleTag = (tagId: number) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTerm = searchTerm.trim();
      if (!trimmedTerm) return;

      const exactMatch = tags.find(
        (t) => t.name.toLowerCase() === trimmedTerm.toLowerCase(),
      );

      if (exactMatch) {
        if (!value.includes(exactMatch.id)) {
          toggleTag(exactMatch.id);
        } else {
          setSearchTerm("");
        }
      } else {
        createTagMutation.mutate(trimmedTerm);
      }
    } else if (
      e.key === "Backspace" &&
      searchTerm === "" &&
      selectedTags.length > 0
    ) {
      const lastTag = selectedTags[selectedTags.length - 1];
      onChange(value.filter((id) => id !== lastTag.id));
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show loading if we are fetching tags for the FIRST time and have no data
  const isInitialLoading = isTagsLoading && tags.length === 0;

  return (
    <div className="relative group" ref={containerRef}>
      {/* Main Container */}
      <div
        onClick={() => {
          if (!disabled && !isInitialLoading) {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
        className={cn(
          "min-h-10 w-full rounded-xl bg-(--fuwari-btn-regular-bg) px-2 py-1.5 text-sm cursor-text",
          (disabled || isInitialLoading) && "cursor-not-allowed opacity-50",
          "flex flex-wrap items-center gap-1.5",
        )}
      >
        {/* Selected Tags */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-(--fuwari-card-bg) px-2 text-sm text-(--fuwari-btn-content)"
          >
            <span className="truncate max-w-37.5">{tag.name}</span>
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) toggleTag(tag.id);
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-20 bg-transparent outline-none placeholder:text-muted-foreground text-sm h-6"
          placeholder={
            selectedTags.length === 0 ? m.tag_selector_search_placeholder() : ""
          }
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => !isInitialLoading && setOpen(true)}
          disabled={disabled || isInitialLoading}
        />

        {/* Loading Spinner */}
        {(isInitialLoading || createTagMutation.isPending) && (
          <div className="animate-spin text-muted-foreground mr-1">
            <Loader2 size={12} />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {open && !disabled && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl bg-(--fuwari-card-bg) shadow-md ring-1 ring-(--fuwari-input-border) animate-in fade-in-0 zoom-in-95">
          <div className="max-h-50 w-full overflow-y-auto overflow-x-hidden p-1">
            {/* Create Option */}
            {searchTerm &&
              !tags.some(
                (t) => t.name.toLowerCase() === searchTerm.toLowerCase(),
              ) && (
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => createTagMutation.mutate(searchTerm)}
                >
                  <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{m.tag_selector_create_action({ searchTerm })}</span>
                </div>
              )}

            {/* Filtered List */}
            {isError ? (
              <div className="p-2 text-xs text-destructive text-center">
                <p>{m.tag_selector_load_fail()}</p>
              </div>
            ) : availableTags.length === 0 && !searchTerm ? (
              <p className="p-2 text-xs text-muted-foreground text-center">
                {searchTerm
                  ? m.tag_selector_no_match()
                  : m.tag_selector_empty()}
              </p>
            ) : availableTags.length === 0 &&
              searchTerm &&
              !createTagMutation.isPending ? null : (
              availableTags.map((tag) => {
                const isSelected = value.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      isSelected
                        ? "bg-accent/50 text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <Hash className="mr-2 h-4 w-4 text-muted-foreground/50" />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isSelected && (
                      <Check className="ml-auto h-4 w-4 opacity-50" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
