import { type LucideIcon, RotateCcw, Save, Send } from "lucide-react";
import type {
  deletePostRevisionsFn,
  getPostRevisionFn,
  listPostRevisionsFn,
} from "@/features/posts/api/post-revisions.admin.api";
import { ms } from "@/lib/duration";
import { m } from "@/paraglide/messages";

export type RevisionListItem = Awaited<
  ReturnType<typeof listPostRevisionsFn>
>[number];

export type RevisionDetail = NonNullable<
  Awaited<ReturnType<typeof getPostRevisionFn>>
>;
export type DeleteRevisionsResult = Awaited<
  ReturnType<typeof deletePostRevisionsFn>
>;

export const HISTORY_POLL_WINDOW_MS = ms("20s");
export const HISTORY_POLL_INTERVAL_MS = ms("3s");

export function getRevisionReasonLabel(reason: RevisionListItem["reason"]) {
  switch (reason) {
    case "publish":
      return m.editor_history_reason_publish();
    case "restore_backup":
      return m.editor_history_reason_restore_backup();
    case "auto":
    default:
      return m.editor_history_reason_auto();
  }
}

export function getRevisionReasonVariant(reason: RevisionListItem["reason"]) {
  switch (reason) {
    case "publish":
      return "default" as const;
    case "restore_backup":
      return "outline" as const;
    case "auto":
    default:
      return "secondary" as const;
  }
}

export function getRevisionReasonIcon(
  reason: RevisionListItem["reason"],
): LucideIcon {
  switch (reason) {
    case "publish":
      return Send;
    case "restore_backup":
      return RotateCcw;
    case "auto":
    default:
      return Save;
  }
}

export function getRevisionReasonColorClass(
  reason: RevisionListItem["reason"],
) {
  switch (reason) {
    case "publish":
      return "border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:border-green-500/40 dark:bg-green-500/20 dark:text-green-400";
    case "restore_backup":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-400";
    case "auto":
    default:
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-400";
  }
}

export function getRestoreErrorMessage(reason: string) {
  switch (reason) {
    case "POST_NOT_FOUND":
      return m.editor_history_error_post_not_found();
    case "POST_REVISION_NOT_FOUND":
      return m.editor_history_error_revision_not_found();
    case "POST_REVISION_INVALID_SNAPSHOT":
      return m.editor_history_error_invalid_snapshot();
    default:
      return m.editor_action_unknown_error();
  }
}

export function getDeleteErrorMessage(reason: string) {
  switch (reason) {
    default:
      return m.editor_action_unknown_error();
  }
}
