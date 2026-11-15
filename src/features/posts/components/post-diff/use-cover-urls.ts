import { useQuery } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc";

/**
 * Images per read of the media library. The read binds each image twice in
 * one query, and D1 allows 100 bound values per query, so a page of 50 or more
 * fails.
 */
const PAGE_SIZE = 40;

/** Pages read before giving up on an image: 1000 images. */
const MAX_PAGES = 25;

/**
 * The addresses of covers known only by their Media id, as a Post Revision
 * names them. There is no read of one Media by id, so the media library is
 * read, newest first, until every id is found. An id that is not found has no
 * entry; a revision keeps its Media from deletion, so that is a lookup that
 * gave up, not an image that is gone.
 */
export function useCoverUrls(ids: ReadonlyArray<number>) {
  const wanted = [...new Set(ids)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["post-diff", "cover-urls", wanted],
    enabled: wanted.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const found = new Map<number, string>();
      let cursor: number | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await orpcClient.media.list({
          limit: PAGE_SIZE,
          cursor,
        });
        for (const item of result.items) {
          if (wanted.includes(item.id)) found.set(item.id, item.url);
        }
        if (found.size === wanted.length || result.nextCursor == null) break;
        cursor = result.nextCursor;
      }
      return Object.fromEntries(found) as Record<number, string>;
    },
  });
}
