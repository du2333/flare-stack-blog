import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hash, Plus, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { FloatingPopover } from "@/components/ui/floating-popover";
import { ListboxOption } from "@/components/ui/listbox-option";
import { Spinner } from "@/components/ui/spinner";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { orpcClient } from "@/lib/orpc";
import type { Tag } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "@/components/ui/field.css";

const MENU_MAX_HEIGHT = 200;

interface TagSelectorProps {
  value: Array<number>;
  onChange: (value: Array<number>) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

export function TagSelector({
  value,
  onChange,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // -1 until the arrow keys move: Enter then acts on the typed text.
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
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
      changeSearch("");

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
      void queryClient.invalidateQueries({
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

  const changeSearch = (term: string) => {
    setSearchTerm(term);
    setActiveIndex(-1);
  };

  const toggleTag = (tagId: number) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
    changeSearch("");
    inputRef.current?.focus();
  };

  const canCreate =
    searchTerm !== "" &&
    !tags.some((t) => t.name.toLowerCase() === searchTerm.toLowerCase());
  // The listbox in order: creating the typed tag, then the matching tags.
  const options = [
    ...(canCreate
      ? [
          {
            id: `${listId}-create`,
            pick: () => createTagMutation.mutate(searchTerm),
          },
        ]
      : []),
    ...availableTags.map((tag) => ({
      id: `${listId}-${tag.id}`,
      pick: () => toggleTag(tag.id),
    })),
  ];
  const activeOption = open ? options[activeIndex] : undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && options.length) {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next =
        activeIndex < 0 && step < 0
          ? options.length - 1
          : (activeIndex + step + options.length) % options.length;
      setActiveIndex(next);
      document
        .getElementById(options[next].id)
        ?.scrollIntoView?.({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeOption) {
        activeOption.pick();
        return;
      }
      const trimmedTerm = searchTerm.trim();
      if (!trimmedTerm) return;

      const exactMatch = tags.find(
        (t) => t.name.toLowerCase() === trimmedTerm.toLowerCase(),
      );

      if (exactMatch) {
        if (!value.includes(exactMatch.id)) {
          toggleTag(exactMatch.id);
        } else {
          changeSearch("");
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

  // Only show loading if we are fetching tags for the FIRST time and have no data
  const isInitialLoading = isTagsLoading && tags.length === 0;

  return (
    <div className="relative group">
      {/* Main Container */}
      <div
        ref={fieldRef}
        onClick={() => {
          if (!disabled && !isInitialLoading) {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
        className={cn(
          "fuwari-field-shell flex-wrap gap-1.5 py-1.5",
          !disabled && !isInitialLoading && "cursor-text",
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
          id={id}
          aria-describedby={ariaDescribedBy}
          type="text"
          className="h-6 min-w-20"
          placeholder={
            selectedTags.length === 0 ? m.tag_selector_search_placeholder() : ""
          }
          value={searchTerm}
          onChange={(e) => {
            changeSearch(e.target.value);
            setOpen(true);
          }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
          onKeyDown={handleKeyDown}
          onFocus={() => !isInitialLoading && setOpen(true)}
          disabled={disabled || isInitialLoading}
        />

        {/* Loading Spinner */}
        {(isInitialLoading || createTagMutation.isPending) && (
          <Spinner size={12} className="mr-1 fuwari-text-50" />
        )}
      </div>

      {/* Dropdown Menu */}
      <FloatingPopover
        open={open && !disabled}
        anchor={open && !disabled ? fieldRef.current : null}
        onDismiss={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        matchTriggerWidth
        maxHeight={MENU_MAX_HEIGHT}
        className="flex flex-col"
      >
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="min-h-0 w-full overflow-y-auto overflow-x-hidden p-1"
        >
          {/* Create Option */}
          {canCreate && (
            <ListboxOption
              id={options[0].id}
              active={activeIndex === 0}
              onActivate={() => setActiveIndex(0)}
              onPick={options[0].pick}
              className="px-3"
            >
              <Plus className="mr-2 h-4 w-4 fuwari-text-50" />
              <span>{m.tag_selector_create_action({ searchTerm })}</span>
            </ListboxOption>
          )}

          {/* Filtered List */}
          {isError ? (
            <p className="fuwari-form-field-error p-2 text-center">
              {m.tag_selector_load_fail()}
            </p>
          ) : availableTags.length === 0 && !searchTerm ? (
            <p className="p-2 text-center text-xs fuwari-text-50">
              {searchTerm ? m.tag_selector_no_match() : m.tag_selector_empty()}
            </p>
          ) : availableTags.length === 0 &&
            searchTerm &&
            !createTagMutation.isPending ? null : (
            availableTags.map((tag, index) => {
              const isSelected = value.includes(tag.id);
              const optionIndex = index + (canCreate ? 1 : 0);
              return (
                <ListboxOption
                  key={tag.id}
                  id={options[optionIndex].id}
                  active={activeIndex === optionIndex}
                  current={isSelected}
                  onActivate={() => setActiveIndex(optionIndex)}
                  onPick={options[optionIndex].pick}
                  className="px-3"
                >
                  <Hash className="mr-2 h-4 w-4 fuwari-text-30" />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {isSelected && (
                    <Check className="ml-auto h-4 w-4 opacity-50" />
                  )}
                </ListboxOption>
              );
            })
          )}
        </div>
      </FloatingPopover>
    </div>
  );
}
