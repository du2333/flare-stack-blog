import { useQuery } from "@tanstack/react-query";
import { sessionQuery } from "@/features/auth/queries";

/**
 * Who is signed in, for showing it. Public pages are cached at the edge, so a
 * server render never looks the session up and renders it pending, as the
 * first browser render does; the lookup follows in the browser. A route
 * guard that already loaded it on the server hands its answer over instead.
 *
 * One lookup serves every reader of a page. It is looked up again when the
 * tab regains focus (at most every five seconds, as Better Auth's client
 * did), when another tab signs in or out, when the network comes back, and
 * after an action here changes it (see `sessionQuery`). A failed lookup keeps
 * the last answer.
 */
export function useSession() {
  return useQuery({
    ...sessionQuery,
    enabled: !import.meta.env.SSR,
    retry: false,
    // `sessionQuery` decides when the answer is out of date.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
