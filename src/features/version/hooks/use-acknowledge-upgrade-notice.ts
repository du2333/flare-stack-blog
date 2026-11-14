import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc";
import { upgradeNoticeQuery } from "../queries";

/**
 * Acknowledges the upgrade to the running version. The record is the
 * server's, so once it is written the notice is gone for every browser; here
 * the notice query is set to "nothing to show" without another request. A
 * failed run leaves the notice where it was.
 */
export function useAcknowledgeUpgradeNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpcClient.version.acknowledgeUpgrade(),
    onSuccess: () => {
      queryClient.setQueryData(upgradeNoticeQuery.queryKey, { notice: null });
    },
  });
}
