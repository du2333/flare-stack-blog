import type { GetPostsInput } from "@/features/posts/schema/posts.schema";
import {
  normalizePostCategoryName,
  normalizePostTagName,
} from "@/features/posts/utils/post-public-search";
import { orpc } from "@/lib/orpc";
import {
  emptyListOnNotFound,
  nullOnNotFound,
} from "@/lib/orpc/null-on-not-found";

export function homePostsQuery(page: number) {
  return orpc.posts.home.queryOptions({ input: { page } });
}

export function postsInfiniteQueryOptions(
  filters: {
    tagName?: string;
    categoryName?: string;
    uncategorized?: boolean;
    limit?: number;
  } = {},
) {
  const pageSize = filters.limit ?? 12;
  const tagName = normalizePostTagName(filters.tagName);
  const categoryName = normalizePostCategoryName(filters.categoryName);
  const uncategorized = filters.uncategorized === true;
  return orpc.posts.list.infiniteOptions({
    input: (pageParam: number | undefined) => ({
      cursor: pageParam,
      limit: pageSize,
      tagName,
      categoryName: uncategorized ? undefined : categoryName,
      uncategorized: uncategorized || undefined,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** Resolves to null for a slug no published post has (the server answers 404). */
export function postBySlugQuery(slug: string) {
  return nullOnNotFound(
    orpc.posts.bySlug.queryOptions({ input: { slug } }),
    "POST_NOT_FOUND",
  );
}

/** Resolves to null for a post that does not exist (the server answers 404). */
export function postByIdQuery(id: number) {
  return nullOnNotFound(
    orpc.posts.admin.get.queryOptions({ input: { id } }),
    "POST_NOT_FOUND",
  );
}

export function adminPostsQuery(input: GetPostsInput) {
  return orpc.posts.admin.list.queryOptions({ input });
}

export function adjacentPostsQuery(slug: string) {
  return orpc.posts.adjacent.queryOptions({ input: { slug } });
}

/** Resolves to no revisions for a post that does not exist (the server answers 404). */
export function postRevisionListQuery(postId: number) {
  return emptyListOnNotFound(
    orpc.posts.admin.revisions.list.queryOptions({
      input: { postId },
    }),
    "POST_NOT_FOUND",
  );
}

/** Resolves to null for a revision the post does not have (the server answers 404). */
export function postRevisionDetailQuery(postId: number, revisionId: number) {
  return nullOnNotFound(
    orpc.posts.admin.revisions.get.queryOptions({
      input: { postId, revisionId },
    }),
    "POST_REVISION_NOT_FOUND",
  );
}

export function popularPostsQuery(limit?: number) {
  return orpc.posts.popular.queryOptions({ input: { limit } });
}
