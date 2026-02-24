import { useNavigate } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteImageFn, updateMediaNameFn } from "@/features/media/media.api";
import {
  MEDIA_KEYS,
  linkedMediaKeysQuery,
  mediaInfiniteQueryOptions,
  totalMediaSizeQuery,
} from "@/features/media/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { Route } from "@/routes/admin/media";
import type { MediaCategory } from "@/features/media/media.schema";

export function useMediaLibrary() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { search, unused, category } = Route.useSearch();

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

  const setCategory = (val: MediaCategory | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, category: val }),
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
    ...mediaInfiniteQueryOptions(debouncedSearch, unused, category),
  });

  // Flatten all pages into a single array
  const mediaItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  // Get all visible media keys
  const mediaKeys = useMemo(() => mediaItems.map((m) => m.key), [mediaItems]);

  const { data: linkedKeysData } = useQuery({
    ...linkedMediaKeysQuery(mediaKeys),
    enabled: mediaKeys.length > 0,
  });

  const { data: totalMediaSize } = useQuery(totalMediaSizeQuery);

  // Build linkedMediaIds set
  const linkedMediaIds = useMemo(() => {
    return new Set(linkedKeysData ?? []);
  }, [linkedKeysData]);

  // Clear selections when filters changes (actual data refresh)
  // We use the DEBOUNCED search here because that's what triggers the query
  useEffect(() => {
    setSelectedKeys(new Set());
    setDeleteTarget(null);
  }, [debouncedSearch, unused, category]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (keys: Array<string>) => {
      // 逐个删除
      for (const key of keys) {
        await deleteImageFn({ data: { key } });
      }
      return keys; // 返回 keys 以便在 onSuccess 中使用
    },
    onSuccess: (deletedKeys) => {
      // 刷新列表
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      // 清除选择
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        deletedKeys.forEach((key) => next.delete(key));
        return next;
      });
      setDeleteTarget(null);
      toast.success("资源已永久删除", {
        description: `${deletedKeys.length} 个项目已从存储中永久删除。`,
      });
    },
    onError: (error) => {
      setDeleteTarget(null);
      toast.error("删除失败", {
        description: error.message,
      });
    },
  });

  // Update name mutation
  const updateAsset = useMutation({
    mutationFn: updateMediaNameFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success("资源元数据已更新", {
        description: `元数据更改已保存。`,
      });
    },
    onError: (error) => {
      toast.error("更新元数据失败", {
        description: error.message,
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
      setSelectedKeys(new Set(mediaItems.map((m) => m.key)));
    }
  };

  // Request delete - use cached linkedMediaIds for instant validation
  const requestDelete = (keys: Array<string>) => {
    // 使用已缓存的 linkedMediaIds 直接判断，无需额外 API 请求
    const blockedKeys = keys.filter((key) => linkedMediaIds.has(key));
    const allowedKeys = keys.filter((key) => !linkedMediaIds.has(key));

    // 如果选中了任何受保护资源，只显示 toast 警告，不弹出确认框
    if (blockedKeys.length > 0) {
      toast.warning("无法删除受保护的资源", {
        description: `${blockedKeys.length} 个项目正在被文章使用。请先取消选择这些项目。`,
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
    category,
    setCategory,
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
