import { FileText, Plus, SearchX, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminPage, AdminPageToolbar } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ListCardFoot, ListCardRows } from "@/components/ui/list-card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";
import { PostListColumns, PostRow } from "./components/post-row";
import { PostsStatusTabs, PostsTools } from "./components/posts-toolbar";
import {
  useAppliedPostSort,
  useDeletePost,
  usePosts,
  useTogglePostPin,
  useUnpublishPost,
} from "./hooks";
import { useCreatePost } from "./hooks/use-create-post";
import { useListScroll } from "./hooks/use-list-scroll";
import { PostRowsSkeleton } from "./post-manager-skeleton";
import type {
  AdminPostListItem,
  CategoryFilter,
  SortField,
  StatusFilter,
} from "./types";
import { POSTS_PER_PAGE } from "./types";
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
  /** `replace` corrects the address without a history entry. */
  onSortByChange: (sortBy: SortField, replace?: boolean) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category?: CategoryFilter, replace?: boolean) => void;
  onTagChange: (tag?: number, replace?: boolean) => void;
  onResetFilters: () => void;
}

/**
 * 「文章」: the status as a segmented track, the search ("/" focuses it) and
 * a chip each for the Category, the Tag and the sort; then the Posts in one
 * card, twenty to a page. Every filter lives in the address.
 */
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
  onResetFilters,
}: PostManagerProps) {
  const [toDelete, setToDelete] = useState<AdminPostListItem | null>(null);
  const [toUnpublish, setToUnpublish] = useState<AdminPostListItem | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The field answers at once; the address follows 300 ms after the last
  // key. A change of the address (Back included) puts its term back in the
  // field, and a term the field already had is not sent again.
  const [searchInput, setSearchInput] = useState(search);
  const typed = useDebounce(searchInput, 300);
  const sent = useRef(search);
  useEffect(() => {
    sent.current = search;
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    if (typed === sent.current) return;
    sent.current = typed;
    onSearchChange(typed);
    // Only a settled change of the field is sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);
  const resetFilters = () => {
    sent.current = "";
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
  // What the server applied, which differs from the address's sort while
  // views cannot be sorted by.
  const shownSort = useAppliedPostSort(sortBy, popularity, onSortByChange);
  const viewsSortable = popularity === undefined || popularity === "ready";
  useListScroll(
    scrollRef,
    { page, status, sortBy, search, category, tag },
    !isPending && !isPlaceholderData && !error,
  );
  useEffect(() => {
    if (
      !isPending &&
      !isPlaceholderData &&
      !error &&
      page > Math.max(1, totalPages)
    )
      onPageChange(Math.max(1, totalPages));
  }, [page, totalPages, isPending, isPlaceholderData, error, onPageChange]);

  const create = useCreatePost();
  const createPost = () => create.mutate();
  const remove = useDeletePost({ onSuccess: () => setToDelete(null) });
  const unpublish = useUnpublishPost({ onSuccess: () => setToUnpublish(null) });
  const pin = useTogglePostPin();

  const filtered =
    status !== "ALL" ||
    Boolean(search.trim()) ||
    category !== undefined ||
    tag !== undefined;
  const total = statusCounts
    ? statusCounts.draft + statusCounts.published
    : undefined;
  const first = (page - 1) * POSTS_PER_PAGE + 1;
  const returnFocus = () =>
    triggerRef.current?.isConnected ? triggerRef.current : searchRef.current;

  return (
    <AdminPage
      className="post-manager"
      title={m.admin_posts_title()}
      count={total}
      primaryAction={{
        label: create.isPending
          ? m.admin_posts_creating()
          : m.admin_posts_create(),
        icon: <Plus size={17} />,
        onClick: createPost,
        loading: create.isPending,
      }}
      toolbar={
        <AdminPageToolbar
          tabs={
            <PostsStatusTabs
              status={status}
              statusCounts={statusCounts}
              onStatusChange={onStatusChange}
            />
          }
          tools={
            <PostsTools
              searchTerm={searchInput}
              onSearchChange={setSearchInput}
              searchRef={searchRef}
              category={category}
              onCategoryChange={onCategoryChange}
              tag={tag}
              onTagChange={onTagChange}
              sortBy={shownSort}
              onSortByChange={onSortByChange}
              popularity={popularity}
            />
          }
        />
      }
      body="list"
      scroll={false}
      inset={false}
      loading={isFetching && !isPending}
      stackOnPhone
      bodyLabel={m.admin_posts_title()}
    >
      <PostListColumns
        sortBy={shownSort}
        viewsSortable={viewsSortable}
        onSortByChange={onSortByChange}
      />

      {error ? (
        <EmptyState
          variant="tile"
          icon={TriangleAlert}
          title={m.admin_posts_load_failed()}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {m.error_retry()}
            </Button>
          }
        />
      ) : isPending ? (
        <ListCardRows aria-busy="true">
          <PostRowsSkeleton />
        </ListCardRows>
      ) : posts.length === 0 ? (
        filtered ? (
          <EmptyState
            variant="tile"
            icon={SearchX}
            title={m.admin_posts_no_match()}
            description={m.admin_posts_no_match_desc()}
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {m.admin_posts_clear_filters()}
              </Button>
            }
          />
        ) : (
          <EmptyState
            variant="tile"
            icon={FileText}
            title={m.admin_posts_empty_title()}
            description={m.admin_posts_empty_desc()}
            action={
              <Button
                variant="outline"
                size="sm"
                disabled={create.isPending}
                onClick={createPost}
              >
                {m.admin_posts_create()}
              </Button>
            }
          />
        )
      ) : (
        <ListCardRows
          ref={scrollRef}
          role="rowgroup"
          aria-busy={isPlaceholderData}
          data-scroll-restoration-id="admin-post-list"
        >
          {posts.map((post, index) => (
            <PostRow
              key={post.id}
              index={index}
              post={post}
              sortBy={shownSort}
              popularity={popularity}
              pinPending={pin.isPending && pin.variables.id === post.id}
              onTogglePin={() => pin.mutate(post)}
              onDelete={(trigger) => {
                triggerRef.current = trigger;
                setToDelete(post);
              }}
              onUnpublish={(trigger) => {
                triggerRef.current = trigger;
                setToUnpublish(post);
              }}
            />
          ))}
        </ListCardRows>
      )}

      {!isPending && !error && posts.length > 0 ? (
        <ListCardFoot>
          <span>
            {totalPages > 1
              ? m.admin_posts_range({
                  first,
                  last: first + posts.length - 1,
                  total: totalCount,
                })
              : m.admin_posts_count({ count: totalCount })}
          </span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            label={m.admin_pagination_label()}
            previousLabel={m.admin_pagination_previous()}
            nextLabel={m.admin_pagination_next()}
          />
        </ListCardFoot>
      ) : null}

      <ConfirmationModal
        isOpen={!!toDelete}
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: toDelete?.title.trim() || m.common_untitled(),
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isDanger
        isLoading={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
        }}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={!!toUnpublish}
        title={m.editor_unpublish_confirm_title()}
        message={m.editor_unpublish_confirm_desc()}
        confirmLabel={m.editor_header_unpublish()}
        isDanger
        isLoading={unpublish.isPending}
        onClose={() => setToUnpublish(null)}
        onConfirm={() => {
          if (toUnpublish) unpublish.mutate(toUnpublish.id);
        }}
        returnFocus={returnFocus}
      />
    </AdminPage>
  );
}
