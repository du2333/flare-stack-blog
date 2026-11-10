import { ORPCError } from "@orpc/client";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { editConflictOf } from "./post-editor.model";

export type RevisionListItem = Awaited<
  ReturnType<typeof orpcClient.posts.admin.revisions.list>
>[number];

export type RevisionDetail = NonNullable<
  Awaited<ReturnType<typeof orpcClient.posts.admin.revisions.get>>
>;

export function getRevisionReasonLabel(
  reason: RevisionListItem["reason"],
  restoredFromRevisionId: number | null,
) {
  switch (reason) {
    case "publish":
      return m.editor_history_reason_publish();
    case "restore_backup":
      // A restore names the version it restored; discarding changes does not.
      return restoredFromRevisionId == null
        ? m.editor_history_reason_discard_backup()
        : m.editor_history_reason_restore_backup();
    case "auto":
    default:
      return m.editor_history_reason_auto();
  }
}

export interface RevisionListEntry {
  revision: RevisionListItem;
  /** The title, only when it differs from the adjacent older entry's. */
  title: string | null;
  /** Characters gained or lost against the adjacent older entry; null for the oldest. */
  lengthChange: number | null;
}

/** `revisions` newest first, as the list returns them. */
export function toRevisionListEntries(
  revisions: ReadonlyArray<RevisionListItem>,
): Array<RevisionListEntry> {
  return revisions.map((revision, index) => {
    const older = revisions[index + 1];
    const title = revision.title.trim();
    const changed = older == null || older.title.trim() !== title;
    return {
      revision,
      title: changed ? title || m.common_untitled() : null,
      lengthChange: older ? revision.contentLength - older.contentLength : null,
    };
  });
}

export function formatLengthChange(change: number) {
  return change > 0 ? `+${change}` : `${change}`;
}

export function getRestoreErrorMessage(reason: string) {
  switch (reason) {
    case "POST_NOT_FOUND":
      return m.editor_history_error_post_not_found();
    case "POST_REVISION_NOT_FOUND":
      return m.editor_history_error_revision_not_found();
    case "POST_REVISION_INVALID_SNAPSHOT":
      return m.editor_history_error_invalid_snapshot();
    case "SLUG_TAKEN":
      return m.editor_history_error_slug_taken();
    default:
      return m.editor_action_unknown_error();
  }
}

/**
 * Why a restore was refused. The page shows it until the Admin acts again, so
 * a confirmation that closes over it cannot hide it.
 */
export interface RestoreFailure {
  revisionId: number;
  /** The post was saved again after the history was opened. */
  editConflict: boolean;
  message: string;
}

export function restoreFailureOf(
  error: Error,
  revisionId: number | null,
): RestoreFailure {
  const editConflict = editConflictOf(error) !== null;
  return {
    revisionId: revisionId ?? 0,
    editConflict,
    message: editConflict
      ? m.editor_history_error_edit_conflict()
      : getRestoreErrorMessage(
          error instanceof ORPCError ? error.code : error.message,
        ),
  };
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
