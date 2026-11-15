import { CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

/**
 * What stands where a diff will be: while its reads are under way, and when
 * one of them failed or found nothing. The diff and its page share it, so it
 * stays free of the diff library and the page can load it at once.
 */
export function PostDiffStatus({ kind }: { kind: "loading" | "failed" }) {
  if (kind === "failed") {
    return (
      <EmptyState
        role="alert"
        icon={CircleAlert}
        title={m.editor_diff_failed()}
      />
    );
  }
  return (
    <EmptyState
      role="status"
      title={
        <span className="inline-flex items-center gap-2">
          <Spinner size={16} />
          {m.editor_diff_loading()}
        </span>
      }
    />
  );
}
