import { Plus } from "lucide-react";
import { AdminPage, AdminPageToolbar } from "@/components/admin/admin-page";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { ListCardRows } from "@/components/ui/list-card";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { PostListColumns } from "./components/post-row";
import { PostsStatusTabs, sortLabel } from "./components/posts-toolbar";
import "./post-manager.css";

/** Rows of placeholders in the rows' grid and at their height. */
export function PostRowsSkeleton() {
  return Array.from({ length: 9 }, (_, index) => (
    <div key={index} className="post-skel" aria-hidden>
      <div>
        <Skeleton shimmer style={{ width: `${38 + ((index * 17) % 34)}%` }} />
        <Skeleton
          shimmer
          style={{ width: `${18 + ((index * 11) % 16)}%`, height: 10 }}
        />
      </div>
      <div>
        <Skeleton shimmer style={{ display: "block", width: 52 }} />
      </div>
      <div />
      <div />
      <div>
        <Skeleton shimmer style={{ display: "block", width: 48 }} />
      </div>
      <div />
    </div>
  ));
}

const noop = () => {};

/**
 * The Posts list while its first page loads: the page's own head and bar,
 * their controls still and without counts, so each takes its real size in
 * any language, then the card with placeholder rows.
 */
export function PostManagerPageSkeleton() {
  return (
    <AdminPage
      className="post-manager"
      aria-busy="true"
      title={m.admin_posts_title()}
      primaryAction={{
        label: m.admin_posts_create(),
        icon: <Plus size={17} />,
        onClick: noop,
        disabled: true,
      }}
      toolbar={
        <AdminPageToolbar
          tabs={<PostsStatusTabs status="ALL" onStatusChange={noop} />}
          tools={
            <div inert className="contents">
              <SearchField
                variant="raised"
                shortcut="/"
                value=""
                onValueChange={noop}
                placeholder={m.admin_posts_search_placeholder()}
                aria-label={m.admin_posts_search_placeholder()}
                clearLabel={m.admin_posts_clear_search()}
              />
              <DropdownMenu
                variant="chip"
                ariaLabel={m.admin_posts_filter_category()}
                neutral=""
                value=""
                onChange={noop}
                options={[{ value: "", label: "" }]}
              />
              <DropdownMenu
                variant="chip"
                ariaLabel={m.admin_posts_filter_tag()}
                neutral=""
                value=""
                onChange={noop}
                options={[{ value: "", label: "" }]}
              />
              <DropdownMenu
                variant="chip"
                ariaLabel={m.admin_posts_sort_label()}
                value="updatedAt"
                onChange={noop}
                options={[
                  { value: "updatedAt", label: sortLabel("updatedAt") },
                ]}
              />
            </div>
          }
        />
      }
      body="list"
      scroll={false}
      inset={false}
      stackOnPhone
    >
      <div inert className="contents">
        <PostListColumns
          sortBy="updatedAt"
          viewsSortable
          onSortByChange={noop}
        />
      </div>
      <ListCardRows aria-busy="true">
        <PostRowsSkeleton />
      </ListCardRows>
    </AdminPage>
  );
}
