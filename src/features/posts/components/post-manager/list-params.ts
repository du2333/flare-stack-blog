import type { GetPostsInput } from "@/features/posts/schema/posts.schema";
import type { PostListLocation } from "./list-position";
import { POSTS_PER_PAGE, statusFilterToApi } from "./types";

/**
 * The query input for one page of the Admin post list. Apart from the hooks,
 * which import sonner, so the route's loader can use it without bringing
 * sonner into the first load of every public page.
 */
export function adminPostsListParams({
  page,
  status,
  sortBy,
  search,
  category,
  tag,
}: PostListLocation): GetPostsInput {
  return {
    offset: (page - 1) * POSTS_PER_PAGE,
    limit: POSTS_PER_PAGE,
    ...statusFilterToApi(status),
    sortDir: "DESC",
    sortBy,
    search: search || undefined,
    categoryId: typeof category === "number" ? category : undefined,
    uncategorized: category === "none" || undefined,
    tagId: tag,
  };
}
