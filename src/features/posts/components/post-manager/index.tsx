import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ErrorPage } from "@/components/common/error-page";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { orpc, orpcClient } from "@/lib/orpc";
import { useDebounce } from "@/hooks/use-debounce";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import { PostRow, PostsToolbar } from "./components";
import { useDeletePost, usePosts } from "./hooks";
import { PostManagerSkeleton } from "./post-manager-skeleton";
import type { PostListItem, SortField, StatusFilter } from "./types";

interface PostManagerProps {
  page: number;
  status: StatusFilter;
  sortBy: SortField;
  search: string;
  onPageChange: (page: number) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortByChange: (sortBy: SortField) => void;
  onSearchChange: (search: string) => void;
  onResetFilters: () => void;
}

export function PostManager({
  page,
  status,
  sortBy,
  search,
  onPageChange,
  onStatusChange,
  onSortByChange,
  onSearchChange,
  onResetFilters,
}: PostManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPrimaryAction } = useAdminChrome();
  const [postToDelete, setPostToDelete] = useState<PostListItem | null>(null);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, search, onSearchChange]);

  useEffect(() => {
    if (search !== searchInput && search !== debouncedSearch) {
      setSearchInput(search);
    }
  }, [search]);

  const { posts, totalCount, totalPages, isPending, error } = usePosts({
    page,
    status,
    sortBy,
    search: debouncedSearch,
  });

  const createMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (createdPost) => {
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() });
      navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(createdPost.id) },
      });
    },
  });
  const createPost = createMutation.mutate;
  const isCreating = createMutation.isPending;

  const deleteMutation = useDeletePost({
    onSuccess: () => setPostToDelete(null),
  });

  const createLabel = isCreating
    ? m.admin_posts_creating()
    : m.admin_posts_create();

  useEffect(() => {
    setPrimaryAction({
      label: createLabel,
      onClick: () => createPost(),
      disabled: isCreating,
    });
    return () => setPrimaryAction(null);
  }, [createLabel, createPost, isCreating, setPrimaryAction]);

  const hasActiveFilters =
    status !== "ALL" || sortBy !== "updatedAt" || searchInput !== "";
  const isDefaultFilter =
    !debouncedSearch && status === "ALL" && sortBy === "updatedAt";

  const confirmDelete = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete);
    }
  };

  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <h1 className="text-2xl font-medium fuwari-text-90">
          {m.admin_posts_title()}
        </h1>
        <button
          type="button"
          onClick={() => createPost()}
          disabled={isCreating}
          className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
        >
          {createLabel}
        </button>
      </div>

      <PostsToolbar
        searchTerm={searchInput}
        onSearchChange={setSearchInput}
        status={status}
        onStatusChange={onStatusChange}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        onResetFilters={() => {
          setSearchInput("");
          onResetFilters();
        }}
        hasActiveFilters={hasActiveFilters}
      />

      {error ? (
        <ErrorPage />
      ) : isPending ? (
        <PostManagerSkeleton />
      ) : posts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 fuwari-text-50">
          {isDefaultFilter ? (
            <>
              <p>{m.admin_posts_empty_library()}</p>
              <button
                type="button"
                onClick={() => createPost()}
                disabled={isCreating}
                className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
              >
                {createLabel}
              </button>
            </>
          ) : (
            <>
              <p>{m.admin_posts_no_match()}</p>
              <button
                type="button"
                onClick={onResetFilters}
                className="text-sm text-(--fuwari-primary)"
              >
                {m.admin_posts_clear_filters()}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div>
            {posts.map((post) => (
              <PostRow key={post.id} post={post} onDelete={setPostToDelete} />
            ))}
          </div>
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={ADMIN_ITEMS_PER_PAGE}
            currentPageItemCount={posts.length}
            onPageChange={onPageChange}
          />
        </>
      )}

      <ConfirmationModal
        isOpen={postToDelete !== null}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDelete}
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: postToDelete?.title || m.common_untitled(),
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isLoading={deleteMutation.isPending}
        isDanger
      />
    </div>
  );
}

export {
  SORT_FIELDS,
  STATUS_FILTERS,
  type SortField,
  type StatusFilter,
} from "./types";
