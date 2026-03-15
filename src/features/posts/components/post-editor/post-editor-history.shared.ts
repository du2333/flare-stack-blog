import type {
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
