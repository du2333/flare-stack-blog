import { orpc } from "@/lib/orpc";
import { ms } from "@/lib/duration";

export const updateCheckQuery = orpc.version.check.queryOptions({
  staleTime: ms("6h"),
  retry: false,
});
