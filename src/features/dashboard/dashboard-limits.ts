/*
 * How many rows the overview loads and lists. Its own module, free of server
 * imports, so the page and its skeleton can read the same numbers the
 * service queries with.
 */

/** Posts last edited; the skeleton draws this many rows. */
export const DASHBOARD_RECENT_POSTS_LIMIT = 8;
/** Comments awaiting a reply: loaded, and listed, this many. */
export const DASHBOARD_UNREPLIED_COMMENTS_LIMIT = 3;
