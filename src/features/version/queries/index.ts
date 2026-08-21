import { orpc } from "@/lib/orpc";

export const updateCheckQuery = orpc.version.check.queryOptions({
  staleTime: 1000 * 60 * 10,
});
