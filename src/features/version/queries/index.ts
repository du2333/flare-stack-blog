import { queryOptions } from "@tanstack/react-query";
import { checkUpdateFn } from "../version.api";
import { VERSION_CACHE_KEYS } from "../version.schema";

export const VERSION_KEYS = {
  all: ["version"] as const,
  updateCheck: VERSION_CACHE_KEYS.updateCheck,
};

export const updateCheckQuery = queryOptions({
  queryKey: VERSION_KEYS.updateCheck,
  queryFn: () => checkUpdateFn(),
  staleTime: 1000 * 60 * 10, // 10 minutes
});
