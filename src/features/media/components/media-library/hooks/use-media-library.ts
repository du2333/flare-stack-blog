import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteImageFn,
  updateMediaNameFn,
} from "@/features/media/api/media.api";
import {
  linkedMediaKeysQuery,
  MEDIA_KEYS,
  mediaInfiniteQueryOptions,
  totalMediaSizeQuery,
} from "@/features/media/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";
import { Route } from "@/routes/admin/media";

export function useMediaLibrary() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { search, unused } = Route.useSearch();

  // Search Param Handlers
  const setSearchQuery = (term: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: term }),
      replace: true,
    });
  };

  const setUnusedOnly = (val: boolean) => {
    navigate({
      search: (prev) => ({ ...prev, unused: val }),
    });
  };

  const debouncedSearch = useDebounce(search, 300);

  // Selection & Deletion State (使用 key 作为唯一标识)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteTarget, setDeleteTarget] = useState<Array<string> | null>(null);

  // Infinite Query for media list
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    ...mediaInfiniteQueryOptions(debouncedSearch, unused),
  });

  // Flatten all pages into a single array
  const mediaItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  // Get all visible media keys
  const mediaKeys = useMemo(
    () => mediaItems.map((item) => item.key),
    [mediaItems],
  );

  const { data: linkedKeysData } = useQuery({
    ...linkedMediaKeysQuery(mediaKeys),
    enabled: mediaKeys.length > 0,
  });

  const { data: totalMediaSize } = useQuery(totalMediaSizeQuery);

  // Build linkedMediaIds set
  const linkedMediaIds = useMemo(() => {
    return new Set<string>(linkedKeysData ?? []);
  }, [linkedKeysData]);

  // Clear selections when filters changes (actual data refresh)
  // We use the DEBOUNCED search here because that's what triggers the query
  useEffect(() => {
    setSelectedKeys(new Set());
    setDeleteTarget(null);
  }, [debouncedSearch, unused]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (keys: Array<string>) => {
      const deletedKeys: Array<string> = [];

      for (const key of keys) {
        const result = await deleteImageFn({ data: { key } });
        if (result.error) {
          return { deletedKeys, error: result.error };
        }
        deletedKeys.push(key);
      }

      return { deletedKeys: keys, error: null };
    },
    onSuccess: (result) => {
      const deletedKeys = result.deletedKeys;

      if (deletedKeys.length > 0) {
        // 刷新列表
        queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        // 清除选择
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          deletedKeys.forEach((key) => next.delete(key));
          return next;
        });
      }

      if (result.error) {
        if (deletedKeys.length > 0) {
          toast.warning(m.media_toast_partial_delete(), {
            description: m.media_toast_partial_delete_desc({
              count: deletedKeys.length,
            }),
          });
        } else {
          toast.warning(m.media_toast_delete_fail(), {
            description: m.media_toast_delete_fail_desc(),
          });
        }
        return;
      }

      toast.success(m.media_toast_delete_success(), {
        description: m.media_toast_delete_success_desc({
          count: deletedKeys.length,
        }),
      });
    },
    onSettled: () => {
      setDeleteTarget(null);
    },
  });

  // Update name mutation
  const updateAsset = useMutation({
    mutationFn: (payload: Parameters<typeof updateMediaNameFn>[0]) =>
      updateMediaNameFn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_metadata_updated(), {
        description: m.media_toast_metadata_updated_desc(),
      });
    },
  });

  // Load more handler - memoized to prevent IntersectionObserver recreation
  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Selection handlers
  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedKeys.size === mediaItems.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(mediaItems.map((item) => item.key)));
    }
  };

  // Request delete - use cached linkedMediaIds for instant validation
  const requestDelete = (keys: Array<string>) => {
    // 使用已缓存的 linkedMediaIds 直接判断，无需额外 API 请求
    const blockedKeys = keys.filter((key) => linkedMediaIds.has(key));
    const allowedKeys = keys.filter((key) => !linkedMediaIds.has(key));

    // 如果选中了任何受保护资源，只显示 toast 警告，不弹出确认框
    if (blockedKeys.length > 0) {
      toast.warning(m.media_toast_protected_delete(), {
        description: m.media_toast_protected_delete_desc({
          count: blockedKeys.length,
        }),
      });
      return [];
    }

    // 只有当所有选中项都是未引用时才弹出确认框
    if (allowedKeys.length > 0) {
      setDeleteTarget(allowedKeys);
    }

    return allowedKeys;
  };

  // Confirm delete
  const confirmDelete = (keys?: Array<string>) => {
    const target = keys ?? deleteTarget;
    if (!target || target.length === 0) return;
    deleteMutation.mutate(target);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  return {
    mediaItems,
    totalCount: mediaItems.length,
    searchQuery: search ?? "", // Ensure compatibility with string type
    setSearchQuery,
    unusedOnly: unused ?? false,
    setUnusedOnly,
    selectedIds: selectedKeys, // 保持接口兼容
    toggleSelection,
    selectAll,
    deleteTarget,
    isDeleting: deleteMutation.isPending,
    requestDelete,
    confirmDelete,
    cancelDelete,
    refetch,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    isPending,
    linkedMediaIds,
    totalMediaSize,
    updateAsset,
  };
}
