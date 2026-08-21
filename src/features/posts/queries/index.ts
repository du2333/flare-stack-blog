import {
  normalizePostTagName,
  type GetPostsCountInput,
  type GetPostsInput,
} from "@/features/posts/schema/posts.schema";
import { orpc } from "@/lib/orpc";

export function recentPostsQuery(limit: number) {
  return orpc.posts.list.queryOptions({
    input: { limit },
    select: (data) => data.items,
  });
}

export function postsInfiniteQueryOptions(
  filters: { tagName?: string; limit?: number } = {},
) {
  const pageSize = filters.limit ?? 12;
  const tagName = normalizePostTagName(filters.tagName);
  return orpc.posts.list.infiniteOptions({
    input: (pageParam: number | undefined) => ({
      cursor: pageParam,
      limit: pageSize,
      tagName,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function postBySlugQuery(slug: string) {
  return orpc.posts.bySlug.queryOptions({ input: { slug } });
}

export function postByIdQuery(id: number) {
  return orpc.posts.admin.get.queryOptions({ input: { id } });
}

export function adminPostsQuery(input: GetPostsInput) {
  return orpc.posts.admin.list.queryOptions({ input });
}

export function adminPostsCountQuery(input: GetPostsCountInput) {
  return orpc.posts.admin.count.queryOptions({ input });
}

export function relatedPostsQuery(slug: string, limit?: number) {
  return orpc.posts.related.queryOptions({ input: { slug, limit } });
}

export function postRevisionListQuery(postId: number) {
  return orpc.posts.admin.revisions.list.queryOptions({
    input: { postId },
  });
}

export function postRevisionDetailQuery(postId: number, revisionId: number) {
  return orpc.posts.admin.revisions.get.queryOptions({
    input: { postId, revisionId },
  });
}

export const pinnedPostsQuery = orpc.posts.pinned.queryOptions();

export function popularPostsQuery(limit?: number) {
  return orpc.posts.popular.queryOptions({ input: { limit } });
}
