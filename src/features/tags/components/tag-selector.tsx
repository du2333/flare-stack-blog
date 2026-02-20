import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hash, Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Tag } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { createTagFn } from "@/features/tags/api/tags.api";
import { TAGS_KEYS, tagsAdminQueryOptions } from "@/features/tags/queries";
import { cn } from "@/lib/utils";

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
  const queryClient = useQueryClient();

  // Use admin query options (Infinity staleTime)
  const {
    data: tags = [],
    isLoading: isTagsLoading,
    isError,
    error,
  } = useQuery(tagsAdminQueryOptions());

  // Strict optimistic update following TanStack Query best practices
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await createTagFn({ data: { name } });
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          case "TAG_NAME_ALREADY_EXISTS":
            throw new Error("该标签名称已存在");
          default: {
            reason satisfies never;
            throw new Error("未知错误");
          }
        }
      }
      return result.data;
    },

    // When mutate is called (BEFORE the request)
    onMutate: async (newTagName) => {
      // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: TAGS_KEYS.adminList({}),
      });

      // 2. Snapshot the previous value for rollback
      const previousTags = queryClient.getQueryData<Array<Tag>>(
        TAGS_KEYS.adminList({}),
      );

      // 3. Optimistically update the cache with a temporary tag
      const tempId = -Math.round(Math.random() * 1000000); // Random negative ID
      const optimisticTag: Tag = {
        id: tempId,
        name: newTagName,
        createdAt: new Date(),
      };

      queryClient.setQueryData(
        TAGS_KEYS.adminList({}),
        (old: Array<Tag> | undefined) => {
          if (!old) return [optimisticTag];
          return [...old, optimisticTag].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        },
      );

      // 4. Update selection with optimistic ID immediately
      // This makes it feel instant to the user
      onChange([...value, optimisticTag.id]);
      setSearchTerm("");

      // Return context with snapshot and tempId
      return { previousTags, optimisticTagId: optimisticTag.id };
    },

    // If mutation fails, roll back to snapshot
    onError: (_err, _newTagName, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(TAGS_KEYS.adminList({}), context.previousTags);
      }
      // Also remove the optimistic tag from selection if it failed
      if (context?.optimisticTagId) {
        onChange(value.filter((id) => id !== context.optimisticTagId));
      }
    },

    // If mutation succeeds, we need to swap the optimistic ID with the real ID
    onSuccess: (newTag, _variables, context) => {
      // 1. Update the cache to replace the temp tag with the real one
      queryClient.setQueryData(
        TAGS_KEYS.adminList({}),
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
        value.map((id) => (id === context.optimisticTagId ? newTag.id : id)),
      );
    },

    // Always refetch after error or success for consistency
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: TAGS_KEYS.adminList({}),
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
          "min-h-9 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors cursor-text",
          "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring",
          (disabled || isInitialLoading) && "cursor-not-allowed opacity-50",
          "flex flex-wrap items-center gap-1.5",
        )}
      >
        {/* Selected Tags */}
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="h-5 px-1.5 gap-1 text-[10px] items-center bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Hash size={10} className="text-muted-foreground/50" />
            <span className="truncate max-w-37.5">{tag.name}</span>
            <div
              role="button"
              className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) toggleTag(tag.id);
              }}
            >
              <X size={10} />
            </div>
          </Badge>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-20 bg-transparent outline-none placeholder:text-muted-foreground text-sm h-6"
          placeholder={selectedTags.length === 0 ? "搜索或创建标签..." : ""}
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
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2">
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
                  <span>创建 "{searchTerm}"</span>
                </div>
              )}

            {/* Filtered List */}
            {isError ? (
              <div className="p-2 text-xs text-destructive text-center">
                <p>加载标签失败</p>
                <p className="text-[10px] opacity-70">
                  {error instanceof Error ? error.message : "未知错误"}
                </p>
              </div>
            ) : availableTags.length === 0 && !searchTerm ? (
              <p className="p-2 text-xs text-muted-foreground text-center">
                {searchTerm ? "无匹配标签" : "暂无标签 (输入以创建)"}
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
