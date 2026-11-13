import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  adminPostsSearchSchema,
  type AdminPostsSearch,
} from "@/features/posts/admin-posts-search";
import { PostManager } from "@/features/posts/components/post-manager";
import { adminPostsListParams } from "@/features/posts/components/post-manager/list-params";
import { PostManagerPageSkeleton } from "@/features/posts/components/post-manager/post-manager-skeleton";
import { adminPostsQuery } from "@/features/posts/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts/")({
  ssr: false,
  validateSearch: adminPostsSearchSchema,
  pendingComponent: PostManagerPageSkeleton,
  pendingMs: 0,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      adminPostsQuery(
        adminPostsListParams({
          page: 1,
          status: "ALL",
          sortBy: "updatedAt",
          search: "",
        }),
      ),
    );
    return { title: m.admin_posts_title() };
  },
  component: PostManagerPage,
});

function PostManagerPage() {
  const navigate = useNavigate();
  const current = Route.useSearch();
  const { page, status, sortBy, search, category, tag } = current;

  const updateSearch = (
    updates: Partial<AdminPostsSearch>,
    replace = false,
  ) => {
    void navigate({
      to: "/admin/posts",
      search: { ...current, page: 1, ...updates },
      replace,
    });
  };

  const handleResetFilters = () => {
    void navigate({
      to: "/admin/posts",
      search: {
        page: 1,
        status: "ALL",
        sortBy: "updatedAt",
        search: "",
      },
    });
  };

  return (
    <PostManager
      page={page}
      status={status}
      sortBy={sortBy}
      search={search}
      category={category}
      tag={tag}
      onPageChange={(newPage) => updateSearch({ page: newPage })}
      onStatusChange={(newStatus) => updateSearch({ status: newStatus })}
      onSortByChange={(nextSortBy, replace) =>
        updateSearch({ sortBy: nextSortBy }, replace)
      }
      onSearchChange={(newSearch) => updateSearch({ search: newSearch })}
      onCategoryChange={(nextCategory, replace) =>
        updateSearch({ category: nextCategory }, replace)
      }
      onTagChange={(nextTag, replace) =>
        updateSearch({ tag: nextTag }, replace)
      }
      onResetFilters={handleResetFilters}
    />
  );
}
