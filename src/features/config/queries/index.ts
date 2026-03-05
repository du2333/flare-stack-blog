import { queryOptions } from "@tanstack/react-query";
import { getSystemConfigFn } from "../config.api";

export const CONFIG_KEYS = {
  all: ["config"] as const,

  // Leaf keys (static arrays - no child queries)
  system: ["config", "system"] as const,
};

export const systemConfigQuery = queryOptions({
  queryKey: CONFIG_KEYS.system,
  queryFn: () => getSystemConfigFn(),
});
