import { orpc } from "@/lib/orpc";
import { ms } from "@/lib/duration";

export const updateCheckQuery = orpc.version.check.queryOptions({
  staleTime: ms("6h"),
  retry: false,
});

/** The notice after an upgrade. Reading it for the first time records the version. */
export const upgradeNoticeQuery = orpc.version.upgradeNotice.queryOptions({
  staleTime: ms("5m"),
  retry: false,
});
