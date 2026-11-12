import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PostManager } from "@/features/posts/components/post-manager";
import { adminPostsListParams } from "@/features/posts/components/post-manager/hooks";
import { PostManagerPageSkeleton } from "@/features/posts/components/post-manager/post-manager-skeleton";
import { adminPostsQuery } from "@/features/posts/queries";
import {
  SORT_FIELDS,
  STATUS_FILTERS,
} from "@/features/posts/components/post-manager/types";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  page: z.number().int().positive().optional().default(1).catch(1),
  status: z.enum(STATUS_FILTERS).optional().default("ALL").catch("ALL"),
  sortBy: z
    .enum(SORT_FIELDS)
    .optional()
    .default("updatedAt")
    .catch("updatedAt"),
  search: z.string().optional().default("").catch(""),
  category: z
    .union([z.number().int().positive(), z.literal("none")])
    .optional()
    .catch(undefined),
  tag: z.number().int().positive().optional().catch(undefined),
});

type PostsSearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/admin/posts/")({
  ssr: false,
  validateSearch: searchSchema,
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
    updates: Partial<PostsSearchParams>,
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
