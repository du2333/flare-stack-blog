import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

/**
 * Refreshes what the page shows of the Moments after one was posted, edited
 * or deleted: every query under the `["moments"]` key, and the route data.
 */
export function useMomentRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["moments"] }),
      router.invalidate(),
    ]);
  };
}
