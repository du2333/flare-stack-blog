import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export type RevisionListItem = Awaited<
  ReturnType<typeof orpcClient.posts.admin.revisions.list>
>[number];

export type RevisionDetail = NonNullable<
  Awaited<ReturnType<typeof orpcClient.posts.admin.revisions.get>>
>;

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

export function toDateOrNull(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
