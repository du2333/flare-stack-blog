import { queryOptions } from "@tanstack/react-query";
import { getAdminMomentsFn } from "../api/moments.admin.api";
import { getMomentsFn } from "../api/moments.public.api";

export const MOMENTS_KEYS = {
  all: ["moments"] as const,
  list: ["moments", "list"] as const,
  admin: ["moments", "admin"] as const,
};

export function momentsQuery(limit = 50) {
  return queryOptions({
    queryKey: [...MOMENTS_KEYS.list, limit],
    queryFn: () => getMomentsFn({ data: { limit } }),
    staleTime: 60_000,
  });
}

export function adminMomentsQuery() {
  return queryOptions({
    queryKey: [...MOMENTS_KEYS.admin, { offset: 0, limit: 100 }],
    queryFn: () =>
      getAdminMomentsFn({ data: { offset: 0, limit: 100 } }),
  });
}
