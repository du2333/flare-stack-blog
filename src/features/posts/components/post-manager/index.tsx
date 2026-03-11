import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ListFilter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ErrorPage } from "@/components/common/error-page";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { createEmptyPostFn } from "@/features/posts/api/posts.admin.api";
import { POSTS_KEYS } from "@/features/posts/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import { PostRow, PostsToolbar } from "./components";
import { useDeletePost, usePosts } from "./hooks";
import { PostManagerSkeleton } from "./post-manager-skeleton";
import type {
  PostListItem,
  SortDirection,
  SortField,
  StatusFilter,
} from "./types";

// Re-export types for external use
export {
  SORT_DIRECTIONS,
  SORT_FIELDS,
  type SortDirection,
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
    onSuccess: (createdPost) => {
      // Precise invalidation for new post creation
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
      navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(createdPost.id) },
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
            {m.admin_posts_title()}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {m.admin_posts_sys_name()}
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
            {createMutation.isPending
              ? m.admin_posts_creating()
              : m.admin_posts_create()}
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
                  {m.admin_posts_no_match()}
                  <button
                    className="mt-4 block mx-auto text-[10px] uppercase tracking-widest font-bold hover:underline"
                    onClick={onResetFilters}
                  >
                    [ {m.admin_posts_clear_filters()} ]
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-mono border-b border-border/30 bg-muted/10">
                  <div className="col-span-6">{m.admin_posts_col_info()}</div>
                  <div className="col-span-3">{m.admin_posts_col_status()}</div>
                  <div className="col-span-2">{m.admin_posts_col_time()}</div>
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
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: postToDelete?.title ?? "",
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isDanger={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
