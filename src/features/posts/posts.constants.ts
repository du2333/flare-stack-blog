// Constants of the Posts feature that the browser needs. They live apart from
// the zod schemas so that a component taking one does not bring the schemas
// into the first load of every page.

/** Posts on a page of the Home list. */
export const HOME_POSTS_PER_PAGE = 8;

/** What the Posts list can be sorted by; the Admin's list takes some of them. */
export const POST_SORT_KEYS = [
  "publishedAt",
  "updatedAt",
  "createdAt",
  "id",
  "commentCount",
  "viewCount",
] as const;
