import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { orpc, orpcClient } from "@/lib/orpc";
import { useContentMotion, useMediaQuery } from "@/hooks/use-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { m } from "@/paraglide/messages";
import { PostListHeader, PostRow, PostsToolbar } from "./components";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Spinner } from "@/components/ui/spinner";
import { useListScroll } from "./hooks/use-list-scroll";
import {
  useDeletePost,
  usePosts,
  useTogglePostPin,
  useUnpublishPost,
} from "./hooks";
import { PostManagerSkeleton } from "./post-manager-skeleton";
import type {
  AdminPostListItem,
  CategoryFilter,
  SortField,
  StatusFilter,
} from "./types";
import { PHONE_LAYOUT_QUERY, POSTS_PER_PAGE } from "./types";
import "./post-manager.css";

interface PostManagerProps {
  page: number;
  status: StatusFilter;
  sortBy: SortField;
  search: string;
  category?: CategoryFilter;
  tag?: number;
  onPageChange: (page: number) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortByChange: (sortBy: SortField) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category?: CategoryFilter, replace?: boolean) => void;
  onTagChange: (tag?: number, replace?: boolean) => void;
  /**
   * Filters by one category or tag, dropping the other taxonomy filter; with
   * neither, clears both and leaves the search and the status alone.
   */
  onTaxonomyFilter: (filter: {
    category?: CategoryFilter;
    tag?: number;
  }) => void;
  onResetFilters: () => void;
}

export function PostManager({
  page,
  status,
  sortBy,
  search,
  category,
  tag,
  onPageChange,
  onStatusChange,
  onSortByChange,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onTaxonomyFilter,
  onResetFilters,
}: PostManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [postToDelete, setPostToDelete] = useState<AdminPostListItem | null>(
    null,
  );
  const [postToUnpublish, setPostToUnpublish] =
    useState<AdminPostListItem | null>(null);
  const phone = useMediaQuery(PHONE_LAYOUT_QUERY);
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
    popularity,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = usePosts({ page, status, sortBy, search, category, tag });
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useListScroll(
    scrollRef,
    { page, status, sortBy, search, category, tag },
    !isPending && !isPlaceholderData && !error,
  );
  const motionKey = useRef("");
  if (!isPlaceholderData)
    motionKey.current = `${page}:${status}:${sortBy}:${search}:${category}:${tag}:${isPending}:${posts.map((post) => post.id).join(",")}`;
  useContentMotion(contentRef, motionKey.current);

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
  const deleteMutation = useDeletePost({
    onSuccess: () => setPostToDelete(null),
  });
  const hasTaxonomyFilter = category !== undefined || tag !== undefined;
  const unpublishMutation = useUnpublishPost({
    onSuccess: () => setPostToUnpublish(null),
  });
  const pinMutation = useTogglePostPin();
  const hasSearch = Boolean(searchInput.trim());
  // Views are sorted by only once the popularity snapshot can be read.
  const viewsSortable = popularity === undefined || popularity === "ready";
  const hasContentFilter =
    status !== "ALL" || Boolean(search.trim()) || hasTaxonomyFilter;
  const isEmptyLibrary = !hasContentFilter && totalCount === 0;

  // Pinned under the scrolling rows, or at the end of them on a phone.
  const footer =
    !isPending && !error ? (
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
            itemsPerPage={POSTS_PER_PAGE}
            currentPageItemCount={posts.length}
            onPageChange={onPageChange}
          />
        )}
        {/*
          The full reset is for a search term, alone or with a Category or Tag.
          A status tab is no filter, and Category or Tag chips alone carry
          their own clear button.
        */}
        {hasSearch && (
          <Button variant="text" size="sm" onClick={resetFilters}>
            {m.admin_posts_clear_filters()}
          </Button>
        )}
      </footer>
    ) : null;

  return (
    <AdminPage
      className="post-manager"
      title={m.admin_posts_title()}
      count={
        <>
          {statusCounts ? statusCounts.draft + statusCounts.published : "—"}
          {isFetching && <Spinner size={14} className="ml-2 inline" />}
        </>
      }
      primaryAction={{
        label: createLabel,
        icon: <Plus size={17} />,
        onClick: () => createPost(),
        loading: isCreating,
      }}
      toolbar={
        <PostsToolbar
          searchTerm={searchInput}
          onSearchChange={handleSearchChange}
          searchRef={searchRef}
          status={status}
          statusCounts={statusCounts}
          onStatusChange={onStatusChange}
          category={category}
          onCategoryChange={onCategoryChange}
          tag={tag}
          onTagChange={onTagChange}
          sortBy={sortBy}
          onSortByChange={onSortByChange}
          onClearTaxonomy={() => onTaxonomyFilter({})}
          popularity={popularity}
        />
      }
      body="list"
      scroll={false}
    >
      <div
        ref={scrollRef}
        className="post-list-scroll custom-scrollbar"
        data-scroll-restoration-id="admin-post-list"
        role="region"
        aria-label={m.admin_posts_title()}
        tabIndex={0}
      >
        {error ? (
          <EmptyState
            className="post-list-empty"
            description={m.error_desc()}
            action={
              <Button variant="text" onClick={() => void refetch()}>
                {m.error_retry()}
              </Button>
            }
          />
        ) : (
          <>
            <div className="post-list-table-wrap" aria-busy={isFetching}>
              <div
                className="post-list"
                role="table"
                aria-label={m.admin_posts_title()}
              >
                <PostListHeader
                  sortBy={sortBy}
                  viewsSortable={viewsSortable}
                  onSortByChange={onSortByChange}
                />
                <div ref={contentRef} role="rowgroup">
                  {isPending ? (
                    <PostManagerSkeleton />
                  ) : (
                    posts.map((post) => (
                      <PostRow
                        key={post.id}
                        post={post}
                        sortBy={sortBy}
                        popularity={popularity}
                        onDelete={(target, trigger) => {
                          deleteTriggerRef.current = trigger;
                          setPostToDelete(target);
                        }}
                        onTogglePin={(target) => pinMutation.mutate(target)}
                        pinPending={
                          pinMutation.isPending &&
                          pinMutation.variables.id === post.id
                        }
                        onUnpublish={(target, trigger) => {
                          deleteTriggerRef.current = trigger;
                          setPostToUnpublish(target);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
            {!isPending && posts.length === 0 && (
              <EmptyState
                className="post-list-empty"
                icon={Search}
                description={
                  isEmptyLibrary
                    ? m.admin_posts_empty_library()
                    : m.admin_posts_no_match()
                }
                action={
                  <Button
                    variant="text"
                    disabled={isCreating}
                    onClick={() =>
                      isEmptyLibrary ? createPost() : resetFilters()
                    }
                  >
                    {isEmptyLibrary
                      ? createLabel
                      : m.admin_posts_clear_filters()}
                  </Button>
                }
              />
            )}
            {phone && footer}
          </>
        )}
      </div>
      {!phone && footer}

      <ConfirmationModal
        isOpen={!!postToDelete}
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: postToDelete?.title.trim() || m.common_untitled(),
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isDanger
        isLoading={deleteMutation.isPending}
        onClose={() => setPostToDelete(null)}
        onConfirm={() => {
          if (postToDelete) deleteMutation.mutate(postToDelete);
        }}
        returnFocus={() =>
          deleteTriggerRef.current?.isConnected
            ? deleteTriggerRef.current
            : searchRef.current
        }
      />
      <ConfirmationModal
        isOpen={!!postToUnpublish}
        title={m.editor_unpublish_confirm_title()}
        message={m.editor_unpublish_confirm_desc()}
        confirmLabel={m.editor_header_unpublish()}
        isDanger
        isLoading={unpublishMutation.isPending}
        onClose={() => setPostToUnpublish(null)}
        onConfirm={() => {
          if (postToUnpublish) unpublishMutation.mutate(postToUnpublish.id);
        }}
        returnFocus={() =>
          deleteTriggerRef.current?.isConnected
            ? deleteTriggerRef.current
            : searchRef.current
        }
      />
    </AdminPage>
  );
}
