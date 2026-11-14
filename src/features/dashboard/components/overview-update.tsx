import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateCheckQuery } from "@/features/version/queries";
import { orpcClient } from "@/lib/orpc";
import { UpdateBlock } from "./update-block";

/**
 * The update block of 「概览」, fed by the update check's client query. The
 * Admin starts that query when it opens (`useVersionCheck`), so the page
 * only reads it: the dashboard's own response never waits on GitHub, and the
 * block fills in when the answer arrives. 「重新检查」 runs the forced check
 * and writes its answer into the same query, so the sidebar and every other
 * reader see it too; a failed run leaves the last answer where it was.
 */
export function OverviewUpdate() {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...updateCheckQuery,
    enabled: typeof window !== "undefined",
  });
  const recheck = useMutation({
    mutationFn: () => orpcClient.version.forceCheck(),
    onSuccess: (result) => {
      queryClient.setQueryData(updateCheckQuery.queryKey, result);
    },
  });

  const result = query.data ?? null;
  const checking = recheck.isPending || (result === null && query.isFetching);
  const failed = recheck.isError || query.isError;

  return (
    <UpdateBlock
      result={result}
      checking={checking}
      failed={failed}
      onRecheck={() => recheck.mutate()}
    />
  );
}
