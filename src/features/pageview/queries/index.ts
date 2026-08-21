import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function useViewCounts(slugs: string[]) {
  return useQuery(
    orpc.pageviews.counts.queryOptions({
      input: { slugs },
      enabled: slugs.length > 0,
      staleTime: 5 * 60 * 1000,
    }),
  );
}
