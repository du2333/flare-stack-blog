import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ListFilter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PostRow, PostsToolbar } from "./components";
import { useDeletePost, usePosts } from "./hooks";
import { PostManagerSkeleton } from "./post-manager-skeleton";
import type {
  PostListItem,
  SortDirection,
  SortField,
  StatusFilter,
} from "./types";
import { ErrorPage } from "@/components/common/error-page";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/admin-pagination";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { createEmptyPostFn } from "@/features/posts/api/posts.admin.api";
import { useDebounce } from "@/hooks/use-debounce";

import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { POSTS_KEYS } from "@/features/posts/queries";

// Re-export types for external use
export {
  SORT_DIRECTIONS,
  type SortDirection,
  SORT_FIELDS,
  type SortField,
  STATUS_FILTERS,
  type StatusFilter,
} from "./types";

interface PostManagerProps {
  page: number;
  status: StatusFilter;
  sortDir: SortDirection;
  sortBy: SortField;
  search: string;
  onPageChange: (page: number) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortUpdate: (update: { dir?: SortDirection; sortBy?: SortField }) => void;
  onSearchChange: (search: string) => void;
  onResetFilters: () => void;
}

export function PostManager({
  page,
  status,
  sortDir,
  sortBy,
  search,
  onPageChange,
  onStatusChange,
  onSortUpdate,
  onSearchChange,
  onResetFilters,
}: PostManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [postToDelete, setPostToDelete] = useState<PostListItem | null>(null);

  // Local search input state for debouncing
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, search, onSearchChange]);

  // Sync local state when URL search changes (e.g., browser back/forward, reset)
  useEffect(() => {
    if (search !== searchInput && search !== debouncedSearch) {
      setSearchInput(search);
    }
  }, [search]);

  // Fetch posts data using debounced search
  const { posts, totalCount, totalPages, isPending, error } = usePosts({
    page,
    status,
    sortDir,
    sortBy,
    search: debouncedSearch,
  });

  // Create empty post mutation
  const createMutation = useMutation({
    mutationFn: () => createEmptyPostFn(),
    onSuccess: (result) => {
      // Precise invalidation for new post creation
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
      navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(result.id) },
      });
    },
    onError: (e) => {
      toast.error("新建条目失败", {
        description: e.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useDeletePost({
    onSuccess: () => setPostToDelete(null),
  });

  const handleDelete = (post: PostListItem) => {
    setPostToDelete(post);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            文章管理
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              POSTS_MANAGEMENT_SYSTEM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="h-10 px-6 text-[11px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            <Plus size={14} />
            {createMutation.isPending ? "创建中..." : "新建文章"}
          </Button>
        </div>
      </div>

      <div className="animate-in fade-in duration-1000 delay-100 fill-mode-both space-y-8">
        {/* Toolbar */}
        <PostsToolbar
          searchTerm={searchInput}
          onSearchChange={setSearchInput}
          status={status}
          onStatusChange={onStatusChange}
          sortDir={sortDir}
          sortBy={sortBy}
          onSortUpdate={onSortUpdate}
          onResetFilters={() => {
            setSearchInput("");
            onResetFilters();
          }}
        />

        {/* List Content */}
        {error ? (
          <ErrorPage />
        ) : isPending ? (
          <PostManagerSkeleton />
        ) : (
          <div className="space-y-0">
            {posts.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-4 border border-dashed border-border/30">
                <ListFilter size={32} strokeWidth={1} className="opacity-20" />
                <div className="text-center font-mono text-xs">
                  未找到匹配的文章
                  <button
                    className="mt-4 block mx-auto text-[10px] uppercase tracking-widest font-bold hover:underline"
                    onClick={onResetFilters}
                  >
                    [ 清除所有筛选 ]
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-mono border-b border-border/30 bg-muted/10">
                  <div className="col-span-6">文章信息</div>
                  <div className="col-span-3">当前状态</div>
                  <div className="col-span-2">时间节点</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-border/30 border-b border-border/30">
                  {posts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={ADMIN_ITEMS_PER_PAGE}
          currentPageItemCount={posts.length}
          onPageChange={onPageChange}
        />
      </div>

      {/* --- Confirmation Modal --- */}
      <ConfirmationModal
        isOpen={!!postToDelete}
        onClose={() => !deleteMutation.isPending && setPostToDelete(null)}
        onConfirm={confirmDelete}
        title="确认删除"
        message={`您确定要永久删除文章 "${postToDelete?.title}" 吗？此操作无法撤销。`}
        confirmLabel="确认删除"
        isDanger={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
