import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { orpcClient } from "@/lib/orpc";
import { updateCheckQuery } from "../queries";

/**
 * Stops the reminder for the latest version, or with null brings it back. The
 * record is the server's, so every browser agrees; once it is written the
 * update check's query is marked to match without another request, and a
 * failed run leaves the answer as it was.
 */
export function useDismissUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: string | null) =>
      orpcClient.version.dismissUpdate({ version }),
    onSuccess: (_result, version) => {
      queryClient.setQueryData<UpdateCheckResult>(
        updateCheckQuery.queryKey,
        (data) => {
          if (!data) return data;
          if (version === null) return { ...data, dismissed: false };
          return data.latestVersion === version
            ? { ...data, dismissed: true }
            : data;
        },
      );
    },
  });
}
