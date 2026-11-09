import { queryOptions } from "@tanstack/react-query";
import { ORPCError } from "@orpc/client";
import { orpcClient } from "@/lib/orpc";

// Every Moments query is keyed under "moments", so one
// `invalidateQueries({ queryKey: MOMENTS_QUERY_KEY })` after the Admin posts,
// edits or deletes a Moment refreshes the timeline, the single page, the home
// sidebar and the navigation entry together.
export const MOMENTS_QUERY_KEY = ["moments"] as const;

export function momentsPageQuery(page: number) {
  return queryOptions({
    queryKey: [...MOMENTS_QUERY_KEY, "list", page],
    queryFn: ({ signal }) => orpcClient.moments.list({ page }, { signal }),
  });
}

export const latestMomentsQuery = queryOptions({
  queryKey: [...MOMENTS_QUERY_KEY, "latest"],
  queryFn: ({ signal }) => orpcClient.moments.latest(undefined, { signal }),
});

export const momentsExistQuery = queryOptions({
  queryKey: [...MOMENTS_QUERY_KEY, "exists"],
  queryFn: ({ signal }) => orpcClient.moments.exists(undefined, { signal }),
});

/** Resolves to null for a Moment that does not exist (the server answers 404). */
export function momentQuery(id: number) {
  return queryOptions({
    queryKey: [...MOMENTS_QUERY_KEY, "detail", id],
    queryFn: async ({ signal }) => {
      try {
        return await orpcClient.moments.byId({ id }, { signal });
      } catch (error) {
        if (error instanceof ORPCError && error.code === "MOMENT_NOT_FOUND") {
          return null;
        }
        throw error;
      }
    },
  });
}
