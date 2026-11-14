import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc";
import { updateCheckQuery } from "../queries";

/**
 * The forced update check, which skips the cache. Its answer is written into
 * the update check's query, so every reader of that query sees it; a failed
 * run leaves the query's last answer where it was.
 */
export function useForceVersionCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpcClient.version.forceCheck(),
    onSuccess: (result) => {
      queryClient.setQueryData(updateCheckQuery.queryKey, result);
    },
  });
}
