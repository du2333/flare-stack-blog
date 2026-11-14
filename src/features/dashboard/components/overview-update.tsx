import { useQuery } from "@tanstack/react-query";
import { useDismissUpdate } from "@/features/version/hooks/use-dismiss-update";
import { useForceVersionCheck } from "@/features/version/hooks/use-force-version-check";
import { updateCheckQuery } from "@/features/version/queries";
import {
  type DismissalChange,
  type UpdateStatus,
  UpdateBlock,
} from "./update-block";

/**
 * The update line of 「概览」, fed by the update check's client query. The
 * Admin starts that query when it opens (`useVersionCheck`), so the page
 * only reads it: the dashboard's own response never waits on GitHub, and the
 * line fills in when the answer arrives. 「重新检查」 runs the forced check,
 * which writes its answer into the same query. 「不再提醒此版本」 and
 * 「恢复提醒」 write the dismissal on the server and mark the same query.
 */
export function OverviewUpdate() {
  const query = useQuery({
    ...updateCheckQuery,
    enabled: typeof window !== "undefined",
  });
  const recheck = useForceVersionCheck();
  const dismissal = useDismissUpdate();

  const result = query.data ?? null;
  // A check that failed is over once a later one has answered, whichever
  // way it was run: the forced check's failure only counts if no answer has
  // arrived since it was sent.
  const failed =
    query.isError ||
    (recheck.isError && recheck.submittedAt >= query.dataUpdatedAt);
  const checking = recheck.isPending || (result === null && query.isFetching);

  let status: UpdateStatus;
  if (result === null)
    status = failed && !checking ? { kind: "failed" } : { kind: "pending" };
  else
    status = {
      kind: "ready",
      result,
      activity: checking ? "checking" : failed ? "failed" : "idle",
    };

  const of = dismissal.variables === null ? "restore" : "dismiss";
  const change: DismissalChange = dismissal.isPending
    ? { kind: "pending", of }
    : dismissal.isError
      ? { kind: "failed", of }
      : dismissal.isSuccess
        ? { kind: "done", of }
        : { kind: "idle" };

  return (
    <UpdateBlock
      status={status}
      change={change}
      onRecheck={() => {
        // A new check ends what the last change announced.
        dismissal.reset();
        recheck.mutate();
      }}
      onOpenDetails={() => {
        // A failure of the last change is over once the details are opened.
        if (!dismissal.isPending) dismissal.reset();
      }}
      onDismiss={() => {
        if (result && !dismissal.isPending)
          dismissal.mutate(result.latestVersion);
      }}
      onRestore={() => {
        if (!dismissal.isPending) dismissal.mutate(null);
      }}
    />
  );
}
