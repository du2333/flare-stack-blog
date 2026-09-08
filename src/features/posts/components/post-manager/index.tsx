import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { orpc, orpcClient } from "@/lib/orpc";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";
import { PostRow, PostsToolbar } from "./components";
import { PostDeleteDialog } from "./components/post-delete-dialog";
import { useDeletePost, usePosts } from "./hooks";
import { PostManagerSkeleton } from "./post-manager-skeleton";
import type { PostListItem, SortField, StatusFilter } from "./types";
import "./post-manager.css";

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
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCallbackRef = useRef(onSearchChange);
  searchCallbackRef.current = onSearchChange;
  const [searchInput, setSearchInput] = useState(search);
  const clearPendingSearch = useCallback(() => {
    if (searchTimerRef.current !== null) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
  }, []);
  // URL changes (including browser Back) supersede any pending text submission.
  useEffect(() => {
    clearPendingSearch();
    setSearchInput(search);
  }, [search, clearPendingSearch]);
  useEffect(() => clearPendingSearch, [clearPendingSearch]);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearPendingSearch();
    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      searchCallbackRef.current(value);
    }, 300);
  };
  const resetFilters = () => {
    clearPendingSearch();
    setSearchInput("");
    onResetFilters();
  };
  const {
    posts,
    totalCount,
    totalPages,
    statusCounts,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = usePosts({ page, status, sortBy, search });
  useEffect(() => {
    if (
      !isPending &&
      !isPlaceholderData &&
      !error &&
      page > Math.max(1, totalPages)
    )
      onPageChange(Math.max(1, totalPages));
  }, [page, totalPages, isPending, isPlaceholderData, error, onPageChange]);

  const createMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      void navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(post.id) },
      });
    },
    onError: () => toast.error(m.admin_posts_create_failed()),
  });
  const createPost = createMutation.mutate;
  const isCreating = createMutation.isPending;
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
  const deleteMutation = useDeletePost({
    onSuccess: () => setPostToDelete(null),
  });
  const hasActiveFilters =
    status !== "ALL" || sortBy !== "updatedAt" || Boolean(searchInput);
  const hasContentFilter = status !== "ALL" || Boolean(search.trim());
  const isEmptyLibrary = !hasContentFilter && totalCount === 0;

  return (
    <section className="post-manager fuwari-card-base">
      <header className="post-list-heading">
        <div>
          <h1>{m.admin_posts_title()}</h1>
          <p>
            {statusCounts
              ? m.admin_posts_total({
                  count: statusCounts.draft + statusCounts.published,
                })
              : "—"}
            {isFetching && (
              <Loader2
                size={14}
                className="ml-2 inline animate-spin"
                aria-hidden="true"
              />
            )}
          </p>
        </div>
        <button
          type="button"
          className="post-list-create fuwari-btn-primary"
          onClick={() => createPost()}
          disabled={isCreating}
        >
          <Plus size={19} />
          {createLabel}
        </button>
      </header>
      <PostsToolbar
        searchTerm={searchInput}
        onSearchChange={handleSearchChange}
        searchRef={searchRef}
        status={status}
        statusCounts={statusCounts}
        onStatusChange={onStatusChange}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
      />
      {error ? (
        <div className="post-list-empty">
          <p>{m.error_desc()}</p>
          <button type="button" onClick={() => void refetch()}>
            {m.error_retry()}
          </button>
        </div>
      ) : (
        <>
          <div className="post-list-table-wrap" aria-busy={isFetching}>
            <table className="post-list-table">
              <colgroup>
                <col className="post-list-title-col" />
                <col className="post-list-status-col" />
                <col className="post-list-date-col" />
                <col className="post-list-actions-col" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">{m.admin_posts_col_title()}</th>
                  <th scope="col">{m.admin_posts_filter_status()}</th>
                  <th scope="col">
                    {sortBy === "updatedAt"
                      ? m.admin_posts_sort_recent_upd()
                      : m.admin_posts_sort_recent_pub()}
                  </th>
                  <th scope="col">{m.admin_posts_col_actions()}</th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <PostManagerSkeleton />
                ) : (
                  posts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      sortBy={sortBy}
                      onDelete={(target, trigger) => {
                        deleteTriggerRef.current = trigger;
                        setPostToDelete(target);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isPending && posts.length === 0 && (
            <div className="post-list-empty">
              <Search size={30} aria-hidden="true" />
              <p>
                {isEmptyLibrary
                  ? m.admin_posts_empty_library()
                  : m.admin_posts_no_match()}
              </p>
              <button
                type="button"
                disabled={isCreating}
                onClick={() => (isEmptyLibrary ? createPost() : resetFilters())}
              >
                {isEmptyLibrary ? createLabel : m.admin_posts_clear_filters()}
              </button>
            </div>
          )}
          {!isPending && (
            <footer className="post-list-footer">
              {totalPages <= 1 ? (
                <p>
                  {hasContentFilter
                    ? m.admin_posts_results({ count: totalCount })
                    : m.admin_posts_total({ count: totalCount })}
                </p>
              ) : (
                <AdminPagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={ADMIN_ITEMS_PER_PAGE}
                  currentPageItemCount={posts.length}
                  onPageChange={onPageChange}
                />
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="post-list-reset"
                  onClick={resetFilters}
                >
                  {m.admin_posts_clear_filters()}
                </button>
              )}
            </footer>
          )}
        </>
      )}
      {postToDelete && (
        <PostDeleteDialog
          title={postToDelete.title.trim() || m.common_untitled()}
          busy={deleteMutation.isPending}
          onClose={() => setPostToDelete(null)}
          onConfirm={() => deleteMutation.mutate(postToDelete)}
          returnFocus={deleteTriggerRef.current}
          fallbackFocus={searchRef.current}
        />
      )}
    </section>
  );
}
