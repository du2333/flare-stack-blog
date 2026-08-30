import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PostManager } from "@/features/posts/components/post-manager";
import type {
  SortField,
  StatusFilter,
} from "@/features/posts/components/post-manager/types";
import {
  SORT_FIELDS,
  STATUS_FILTERS,
} from "@/features/posts/components/post-manager/types";

const searchSchema = z.object({
  page: z.number().int().positive().optional().default(1).catch(1),
  status: z.enum(STATUS_FILTERS).optional().default("ALL").catch("ALL"),
  sortBy: z
    .enum(SORT_FIELDS)
    .optional()
    .default("updatedAt")
    .catch("updatedAt"),
  search: z.string().optional().default("").catch(""),
});

export type PostsSearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/admin/posts/")({
  ssr: false,
  validateSearch: searchSchema,
  component: PostManagerPage,
});

function PostManagerPage() {
  const navigate = useNavigate();
  const { page, status, sortBy, search } = Route.useSearch();

  const updateSearch = (updates: Partial<PostsSearchParams>) => {
    navigate({
      to: "/admin/posts",
      search: {
        page: updates.page ?? 1,
        status: updates.status ?? status,
        sortBy: updates.sortBy ?? sortBy,
        search: updates.search ?? search,
      },
    });
  };

  const handleResetFilters = () => {
    navigate({
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
      onPageChange={(newPage) => updateSearch({ page: newPage })}
      onStatusChange={(newStatus: StatusFilter) =>
        updateSearch({ status: newStatus })
      }
      onSortByChange={(nextSortBy: SortField) =>
        updateSearch({ sortBy: nextSortBy })
      }
      onSearchChange={(newSearch) => updateSearch({ search: newSearch })}
      onResetFilters={handleResetFilters}
    />
  );
}
