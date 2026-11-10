import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postPopularityStatusQuery } from "@/features/post-popularity/queries";
import { orpc, orpcClient } from "@/lib/orpc";

/** Syncs the Post Popularity Snapshot and refreshes what shows it. */
export function usePostPopularitySync({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpcClient.postPopularity.sync(),
    onSuccess: async (result) => {
      queryClient.setQueryData(postPopularityStatusQuery.queryKey, result);
      // Awaited, so the mutation stays pending until a mounted overview has
      // refetched and the notice that offered the sync is gone.
      await queryClient.invalidateQueries({
        queryKey: orpc.dashboard.overview.key(),
      });
      onSuccess?.();
    },
    onError,
    onSettled: () => {
      void queryClient.invalidateQueries(postPopularityStatusQuery);
    },
  });
}
