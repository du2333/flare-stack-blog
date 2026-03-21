import { useQuery } from "@tanstack/react-query";
import { getViewCountsFn } from "../api/pageview.api";

export const PAGEVIEW_KEYS = {
  viewCounts: (slugs: string[]) => ["pageview", "counts", ...slugs] as const,
};

export function useViewCounts(slugs: string[]) {
  return useQuery({
    queryKey: PAGEVIEW_KEYS.viewCounts(slugs),
    queryFn: () => getViewCountsFn({ data: { slugs } }),
    enabled: slugs.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
