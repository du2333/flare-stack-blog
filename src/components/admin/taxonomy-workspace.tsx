import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BookOpen,
  Hash,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAdminChrome } from "./admin-chrome";
import { AdminPagination } from "./admin-pagination";
import type { TaxonomyState } from "./taxonomy-state";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import {
  CategoryManager,
  type CategoryEdit,
} from "@/features/categories/components/category-manager";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import {
  TagManager,
  type EditingTag,
} from "@/features/tags/components/tag-manager";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { adminPostsQuery } from "@/features/posts/queries";
import type { AdminTaxonomyFilter } from "@/features/posts/schema/posts.schema";
import { PostRow } from "@/features/posts/components/post-manager/components/post-row";
import { PostManagerSkeleton } from "@/features/posts/components/post-manager/post-manager-skeleton";
import { useDeletePost } from "@/features/posts/components/post-manager/hooks/use-posts";
import type {
  PostListItem,
  SortField,
} from "@/features/posts/components/post-manager/types";
import { LOW_WORKSPACE_HEIGHT } from "./content-workspace";
import { useContentMotion, useMediaQuery } from "@/hooks/use-motion";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import "@/features/posts/components/post-manager/post-manager.css";
import "./taxonomy.css";

const PAGE_SIZE = 12;
export function TaxonomyWorkspace({
  state,
  onChange,
}: {
  state: TaxonomyState;
  onChange: (patch: Partial<TaxonomyState>, replace?: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { setPrimaryAction } = useAdminChrome();
  const categoriesQuery = useQuery({
    ...categoriesAdminQueryOptions(),
    refetchOnMount: "always",
  });
  const tagsQuery = useQuery({
    ...tagsWithCountAdminQueryOptions(),
    refetchOnMount: "always",
  });
  const [categoryEdit, setCategoryEdit] = useState<CategoryEdit | null>(null);
  const [tagEdit, setTagEdit] = useState<EditingTag | null>(null);
  const [navSearch, setNavSearch] = useState("");
  const [searchInput, setSearchInput] = useState(state.search);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLTableSectionElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [postToDelete, setPostToDelete] = useState<PostListItem | null>(null);
  const postDeleteTrigger = useRef<HTMLButtonElement | null>(null);
  const lowHeight = useMediaQuery(LOW_WORKSPACE_HEIGHT);
  const getScroller = () =>
    lowHeight
      ? scrollRef.current?.closest<HTMLElement>(".admin-list-region")
      : scrollRef.current;
  const initialScroll = useLocation({
    select: (location) => location.state.taxonomyScrollTop ?? 0,
  });
  const appliedQuery = useRef<string | null>(null);
  const tagMode = state.kind === "tag";
  const categories = (categoriesQuery.data?.items ?? []).map((item) => ({
    ...item,
    kind: "category" as const,
  }));
  const tags = (tagsQuery.data ?? []).map((item) => ({
    ...item,
    kind: "tag" as const,
  }));
  const items = tagMode ? tags : categories;
  const pending = tagMode ? tagsQuery.isPending : categoriesQuery.isPending;
  const navError = tagMode ? tagsQuery.isError : categoriesQuery.isError;
  const uncategorized = {
    kind: "uncategorized" as const,
    id: null,
    name: m.post_uncategorized(),
    postCount: categoriesQuery.data?.uncategorizedPostCount ?? 0,
    publicPostCount: categoriesQuery.data?.uncategorizedPublicPostCount ?? 0,
  };
  const selected =
    state.kind === "uncategorized"
      ? uncategorized
      : state.id
        ? items.find((item) => item.id === state.id)
        : (items[0] ?? (!tagMode ? uncategorized : undefined));
  const visibleItems = items.filter(
    (item) =>
      !tagMode ||
      item.name.toLowerCase().includes(navSearch.trim().toLowerCase()),
  );
  const taxonomy: AdminTaxonomyFilter | undefined = selected
    ? selected.kind === "uncategorized"
      ? { kind: "uncategorized", scope: state.scope }
      : { kind: selected.kind, id: selected.id, scope: state.scope }
    : undefined;
  const postsQuery = useQuery({
    ...adminPostsQuery({
      taxonomy,
      search: state.search,
      sortBy: state.sortBy,
      sortDir: "DESC",
      limit: PAGE_SIZE,
      offset: (state.page - 1) * PAGE_SIZE,
    }),
    enabled: !!selected && !pending && !navError,
    refetchOnMount: "always",
  });
  const posts = postsQuery.data?.items ?? [];
  const total = postsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryKey = JSON.stringify([
    taxonomy,
    state.search,
    state.sortBy,
    state.page,
  ]);
  useContentMotion(
    rowsRef,
    `${queryKey}:${posts.map((post) => post.id).join(",")}`,
  );
  const clearSearchTimer = useCallback(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }, []);
  useEffect(() => {
    clearSearchTimer();
    setSearchInput(state.search);
  }, [state.search, clearSearchTimer]);
  useEffect(() => clearSearchTimer, [clearSearchTimer]);
  useEffect(() => {
    if (
      !pending &&
      !navError &&
      state.id &&
      state.kind !== "uncategorized" &&
      !items.some((item) => item.id === state.id)
    )
      onChange({ id: undefined, page: 1, search: "" }, true);
  }, [pending, navError, state.id, state.kind, items, onChange]);
  useEffect(() => {
    if (selected && postsQuery.isSuccess && state.page > totalPages)
      onChange({ page: totalPages }, true);
  }, [selected, postsQuery.isSuccess, state.page, totalPages, onChange]);
  useLayoutEffect(() => {
    if (
      !postsQuery.isSuccess ||
      !scrollRef.current ||
      appliedQuery.current === queryKey
    )
      return;
    const scroller = getScroller();
    if (scroller)
      scroller.scrollTop =
        appliedQuery.current === null ? Math.max(0, initialScroll) : 0;
    appliedQuery.current = queryKey;
  }, [postsQuery.isSuccess, queryKey, initialScroll, lowHeight]);
  const openCreate = useCallback(
    () =>
      setCategoryEdit({ id: null, name: "", postCount: 0, publicPostCount: 0 }),
    [],
  );
  useEffect(() => {
    setPrimaryAction({
      label: m.taxonomy_manager_create_category(),
      onClick: openCreate,
    });
    return () => setPrimaryAction(null);
  }, [setPrimaryAction, openCreate]);
  const changeContext = (patch: Partial<TaxonomyState>) => {
    clearSearchTimer();
    setSearchInput("");
    onChange({ ...patch, page: 1, search: "" });
  };
  const choose = (kind: TaxonomyState["kind"], id?: number) =>
    changeContext({ kind, id, scope: "current" });
  const manage = () => {
    if (!selected || selected.kind === "uncategorized") return;
    if (selected.kind === "category") setCategoryEdit(selected);
    else setTagEdit(selected);
  };
  const invalidateCounts = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.categories.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.tags.admin.key() }),
    ]);
  const deletePost = useDeletePost({
    onSuccess: () => {
      setPostToDelete(null);
      void invalidateCounts();
    },
  });
  const action =
    selected && selected.kind !== "uncategorized" ? (
      <button
        type="button"
        className="taxonomy-context-action"
        aria-label={
          selected.kind === "category"
            ? m.category_manager_rename()
            : m.tag_manager_edit()
        }
        aria-haspopup="dialog"
        onClick={manage}
      >
        <MoreHorizontal size={20} />
      </button>
    ) : null;
  const returnState = () => ({
    taxonomyReturn: {
      search: {
        ...state,
        kind: selected?.kind ?? state.kind,
        id: selected?.id ?? undefined,
      },
      scrollTop: getScroller()?.scrollTop ?? 0,
    },
  });
  const navRow = (
    item:
      | typeof uncategorized
      | (typeof categories)[number]
      | (typeof tags)[number],
  ) => (
    <button
      key={`${item.kind}:${item.id}`}
      type="button"
      className="taxonomy-nav-item"
      aria-pressed={selected?.kind === item.kind && selected?.id === item.id}
      onClick={() => choose(item.kind, item.id ?? undefined)}
    >
      <span className="taxonomy-nav-name">{item.name}</span>
      <span className="taxonomy-nav-count">
        {item.postCount}
        {item.publicPostCount > 0 && item.postCount === 0 ? (
          <small>
            {m.taxonomy_public_short({ count: item.publicPostCount })}
          </small>
        ) : null}
      </span>
    </button>
  );

  return (
    <div className="taxonomy-workspace fuwari-card-base">
      <header className="taxonomy-heading">
        <div>
          <h1>{m.taxonomy_manager_title()}</h1>
          <p>{m.taxonomy_workspace_hint()}</p>
        </div>
        <button
          type="button"
          className="fuwari-btn-primary taxonomy-create"
          onClick={openCreate}
        >
          <Plus size={17} />
          {m.taxonomy_manager_create_category()}
        </button>
      </header>
      <div className="taxonomy-browser">
        <aside
          className="taxonomy-explorer"
          aria-label={m.taxonomy_manager_title()}
        >
          <div
            className="taxonomy-mode-tabs"
            role="group"
            aria-label={m.taxonomy_manager_title()}
          >
            <button
              type="button"
              aria-pressed={!tagMode}
              onClick={() => {
                setNavSearch("");
                choose("category");
              }}
            >
              {m.category_manager_title()}
            </button>
            <button
              type="button"
              aria-pressed={tagMode}
              onClick={() => choose("tag")}
            >
              {m.tag_manager_title()}
            </button>
          </div>
          {tagMode ? (
            <div className="taxonomy-search taxonomy-nav-search">
              <Search size={15} />
              <input
                aria-label={m.tag_manager_search_placeholder()}
                placeholder={m.tag_manager_search_placeholder()}
                value={navSearch}
                onChange={(event) => setNavSearch(event.target.value)}
              />
              {navSearch ? (
                <button
                  type="button"
                  aria-label={m.tag_manager_clear_search()}
                  onClick={() => setNavSearch("")}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="taxonomy-nav-scroll custom-scrollbar">
            {pending ? (
              <div className="taxonomy-loading">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : navError ? (
              <div className="taxonomy-empty" role="alert">
                <p>{m.error_desc()}</p>
                <button
                  type="button"
                  onClick={() =>
                    void (tagMode
                      ? tagsQuery.refetch()
                      : categoriesQuery.refetch())
                  }
                >
                  {m.error_retry()}
                </button>
              </div>
            ) : (
              <>
                {visibleItems.map(navRow)}
                {tagMode && visibleItems.length === 0 ? (
                  <p className="taxonomy-nav-empty">
                    {tags.length
                      ? m.tag_manager_no_match()
                      : m.tag_manager_empty()}
                  </p>
                ) : null}
                {!tagMode ? (
                  <div className="taxonomy-uncategorized">
                    {navRow(uncategorized)}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="taxonomy-mobile-picker">
            <Select
              value={
                selected?.kind === "uncategorized"
                  ? "uncategorized"
                  : String(selected?.id ?? "")
              }
              options={[
                ...visibleItems.map((item) => ({
                  value: String(item.id),
                  label: `${item.name} · ${item.postCount}`,
                })),
                ...(!tagMode
                  ? [
                      {
                        value: "uncategorized",
                        label: `${uncategorized.name} · ${uncategorized.postCount}`,
                      },
                    ]
                  : []),
              ]}
              onChange={(value) =>
                value === "uncategorized"
                  ? choose("uncategorized")
                  : choose(tagMode ? "tag" : "category", Number(value))
              }
              disabled={pending || navError}
            />
            {action}
          </div>
        </aside>
        <section className="taxonomy-results">
          <header className="taxonomy-selection-heading">
            <h2 ref={headingRef} tabIndex={-1}>
              {selected?.name ??
                (tagMode ? m.tag_manager_title() : m.category_manager_title())}
            </h2>
            {action}
          </header>
          <div
            className="taxonomy-scope-tabs"
            role="group"
            aria-label={m.taxonomy_usage_summary({
              current: selected?.postCount ?? 0,
              public: selected?.publicPostCount ?? 0,
            })}
          >
            <button
              type="button"
              disabled={!selected}
              aria-pressed={state.scope === "current"}
              onClick={() => changeContext({ scope: "current" })}
            >
              {m.taxonomy_scope_current()}{" "}
              <span>{selected?.postCount ?? "—"}</span>
            </button>
            <button
              type="button"
              disabled={!selected}
              aria-pressed={state.scope === "public"}
              onClick={() => changeContext({ scope: "public" })}
            >
              {m.taxonomy_scope_public()}{" "}
              <span>{selected?.publicPostCount ?? "—"}</span>
            </button>
            {postsQuery.isFetching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
          </div>
          <p className="taxonomy-scope-hint">
            {state.scope === "current"
              ? m.taxonomy_scope_current_hint()
              : m.taxonomy_scope_public_hint()}
          </p>
          <div className="taxonomy-post-controls">
            <div className="taxonomy-search">
              <Search size={17} />
              <input
                ref={searchRef}
                type="search"
                aria-label={m.taxonomy_posts_search()}
                placeholder={m.taxonomy_posts_search()}
                value={searchInput}
                disabled={!selected}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchInput(value);
                  clearSearchTimer();
                  searchTimer.current = setTimeout(
                    () => onChange({ search: value, page: 1 }),
                    300,
                  );
                }}
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label={m.admin_posts_clear_search()}
                  onClick={() => changeContext({})}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
            <div className="taxonomy-sort">
              <span>{m.admin_posts_sort_label()}</span>
              <DropdownMenu
                value={state.sortBy}
                ariaLabel={m.admin_posts_sort_label()}
                triggerClassName="taxonomy-sort-trigger"
                options={[
                  {
                    value: "updatedAt",
                    label: m.admin_posts_sort_recent_upd(),
                  },
                  {
                    value: "publishedAt",
                    label: m.admin_posts_sort_recent_pub(),
                  },
                ]}
                onChange={(value) =>
                  onChange({ sortBy: value as SortField, page: 1 })
                }
              />
            </div>
          </div>
          <div
            ref={scrollRef}
            className="taxonomy-post-scroll custom-scrollbar"
            role="region"
            aria-label={selected?.name ?? m.taxonomy_manager_title()}
            tabIndex={0}
            aria-busy={postsQuery.isFetching}
          >
            {!selected ? (
              <div className="taxonomy-empty">
                <Hash size={28} />
                <p>{m.taxonomy_empty_selection()}</p>
              </div>
            ) : postsQuery.isError ? (
              <div className="taxonomy-empty" role="alert">
                <p>{m.error_desc()}</p>
                <button type="button" onClick={() => void postsQuery.refetch()}>
                  {m.error_retry()}
                </button>
              </div>
            ) : (
              <>
                <table className="post-list-table">
                  <colgroup>
                    <col className="post-list-title-col" />
                    <col className="post-list-status-col" />
                    <col className="post-list-date-col" />
                    <col className="post-list-actions-col" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{m.admin_posts_col_title()}</th>
                      <th>{m.admin_posts_col_status()}</th>
                      <th>
                        {state.sortBy === "updatedAt"
                          ? m.admin_posts_sort_recent_upd()
                          : m.admin_posts_sort_recent_pub()}
                      </th>
                      <th>{m.admin_posts_col_actions()}</th>
                    </tr>
                  </thead>
                  <tbody ref={rowsRef}>
                    {postsQuery.isPending ? (
                      <PostManagerSkeleton />
                    ) : (
                      posts.map((post) => (
                        <PostRow
                          key={post.id}
                          post={post}
                          sortBy={state.sortBy}
                          editorState={returnState}
                          onDelete={(target, trigger) => {
                            postDeleteTrigger.current = trigger;
                            setPostToDelete(target);
                          }}
                        />
                      ))
                    )}
                  </tbody>
                </table>
                {!postsQuery.isPending && posts.length === 0 ? (
                  <div className="taxonomy-empty">
                    <BookOpen size={26} />
                    <p>
                      {state.search
                        ? m.admin_posts_no_match()
                        : state.scope === "current"
                          ? m.taxonomy_current_empty()
                          : m.taxonomy_public_empty()}
                    </p>
                    {state.search ? (
                      <button type="button" onClick={() => changeContext({})}>
                        {m.admin_posts_clear_filters()}
                      </button>
                    ) : (
                      <Link to="/admin/posts">{m.admin_posts_title()}</Link>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
          {selected && !postsQuery.isPending && !postsQuery.isError ? (
            <footer className="taxonomy-post-footer">
              {totalPages > 1 ? (
                <AdminPagination
                  currentPage={state.page}
                  totalPages={totalPages}
                  totalItems={total}
                  itemsPerPage={PAGE_SIZE}
                  currentPageItemCount={posts.length}
                  onPageChange={(page) => onChange({ page })}
                />
              ) : (
                <span>
                  {state.search
                    ? m.admin_posts_results({ count: total })
                    : m.admin_posts_total({ count: total })}
                </span>
              )}
            </footer>
          ) : null}
        </section>
      </div>
      <CategoryManager
        editing={categoryEdit}
        onClose={() => setCategoryEdit(null)}
        onCreated={(id) => choose("category", id)}
        fallbackFocus={() => searchRef.current ?? headingRef.current}
      />
      <TagManager
        editing={tagEdit}
        onClose={() => setTagEdit(null)}
        fallbackFocus={() => searchRef.current ?? headingRef.current}
      />
      <ConfirmationModal
        isOpen={postToDelete !== null}
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: postToDelete?.title ?? "",
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isDanger
        isLoading={deletePost.isPending}
        onClose={() => setPostToDelete(null)}
        onConfirm={() => {
          if (postToDelete) deletePost.mutate(postToDelete);
        }}
        returnFocus={() =>
          postDeleteTrigger.current?.isConnected
            ? postDeleteTrigger.current
            : searchRef.current
        }
      />
    </div>
  );
}
