import { queryOptions } from "@tanstack/react-query";
import { getSystemConfigFn } from "../api/config.api";
import { getSiteDomainFn } from "../api/site.api";

export const CONFIG_KEYS = {
  all: ["config"] as const,

  // Leaf keys (static arrays - no child queries)
  system: ["config", "system"] as const,
  siteDomain: ["config", "siteDomain"] as const,
};

export const systemConfigQuery = queryOptions({
  queryKey: CONFIG_KEYS.system,
  queryFn: () => getSystemConfigFn(),
});

export const siteDomainQuery = queryOptions({
  queryKey: CONFIG_KEYS.siteDomain,
  queryFn: () => getSiteDomainFn(),
});
