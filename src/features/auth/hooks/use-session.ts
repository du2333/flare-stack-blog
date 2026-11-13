import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { sessionQuery } from "@/features/auth/queries";
import { onSessionChangeElsewhere } from "@/features/auth/session-broadcast";

// One `storage` listener however many components read the session: each
// would otherwise start its own lookup for the same message.
let readers = 0;
let stopListening: (() => void) | undefined;

function useSessionChangesElsewhere(queryClient: QueryClient) {
  useEffect(() => {
    readers += 1;
    stopListening ??= onSessionChangeElsewhere(() => {
      void queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
    });
    return () => {
      readers -= 1;
      if (readers === 0) {
        stopListening?.();
        stopListening = undefined;
      }
    };
  }, [queryClient]);
}

/**
 * Who is signed in, for showing it. Public pages are cached at the edge, so a
 * server render never looks the session up and renders it pending, as the
 * first browser render does; the lookup follows in the browser. A route
 * guard that already loaded it on the server hands its answer over instead.
 *
 * It loads once, again when the tab regains focus (at most every five
 * seconds, as Better Auth's client did), when another tab signs in or out,
 * and when an action here changes it (`resetAuthBoundQueries`,
 * `refreshSession`). A failed lookup keeps the last answer.
 */
export function useSession() {
  const queryClient = useQueryClient();
  useSessionChangesElsewhere(queryClient);
  return useQuery({
    ...sessionQuery,
    enabled: !import.meta.env.SSR,
    staleTime: 5_000,
    // Components that mount later, such as each Comment, read the answer
    // already there instead of asking again.
    refetchOnMount: false,
    retry: false,
  });
}
