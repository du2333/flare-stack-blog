import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import {
  formatLengthChange,
  getRevisionReasonLabel,
  type RevisionListItem,
  restoreFailureOf,
  toDateOrNull,
  toRevisionListEntries,
} from "./post-editor-history.shared";

describe("restoreFailureOf", () => {
  it("names an Edit Conflict and marks it as one a restore can still override", () => {
    const failure = restoreFailureOf(
      new ORPCError("EDIT_CONFLICT", {
        status: 409,
        defined: true,
        data: { saveToken: "token-2" },
      }),
      7,
    );
    expect(failure).toEqual({
      revisionId: 7,
      editConflict: true,
      message: m.editor_history_error_edit_conflict(),
    });
  });

  it("names a taken link without offering to override it", () => {
    const failure = restoreFailureOf(
      new ORPCError("SLUG_TAKEN", { status: 409, defined: true }),
      7,
    );
    expect(failure.editConflict).toBe(false);
    expect(failure.message).toBe(m.editor_history_error_slug_taken());
  });

  it("falls back to the unknown error for anything else", () => {
    const failure = restoreFailureOf(new Error("network"), 7);
    expect(failure.editConflict).toBe(false);
    expect(failure.message).toBe(m.editor_action_unknown_error());
  });
});

describe("toDateOrNull", () => {
  it("returns null for empty values", () => {
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull(undefined)).toBeNull();
    expect(toDateOrNull("")).toBeNull();
  });

  it("keeps a valid Date", () => {
    const date = new Date("2026-08-22T12:00:00.000Z");
    expect(toDateOrNull(date)?.toISOString()).toBe(date.toISOString());
  });

  it("parses an ISO string", () => {
    expect(toDateOrNull("2026-08-22T12:00:00.000Z")?.toISOString()).toBe(
      "2026-08-22T12:00:00.000Z",
    );
  });

  it("returns null for invalid input", () => {
    expect(toDateOrNull("not-a-date")).toBeNull();
    expect(toDateOrNull({})).toBeNull();
  });
});

function revision(
  id: number,
  title: string,
  contentLength: number,
): RevisionListItem {
  return {
    id,
    postId: 1,
    reason: "publish",
    snapshotHash: String(id),
    restoredFromRevisionId: null,
    createdAt: new Date(id * 1000),
    title,
    summary: null,
    contentLength,
  };
}

describe("toRevisionListEntries", () => {
  it("shows a title only where it differs from the adjacent older entry", () => {
    const entries = toRevisionListEntries([
      revision(4, "Same", 10),
      revision(3, "Same", 10),
      revision(2, "Renamed ", 10),
      revision(1, "Renamed", 10),
    ]);
    expect(entries.map((entry) => entry.title)).toEqual([
      null,
      "Same",
      null,
      "Renamed",
    ]);
  });

  it("names an untitled entry when its title changes", () => {
    const [entry] = toRevisionListEntries([
      revision(2, " ", 0),
      revision(1, "A", 0),
    ]);
    expect(entry?.title).toBe(m.common_untitled());
  });

  it("measures the length against the adjacent older entry, none for the oldest", () => {
    const entries = toRevisionListEntries([
      revision(3, "A", 90),
      revision(2, "A", 100),
      revision(1, "A", 100),
    ]);
    expect(entries.map((entry) => entry.lengthChange)).toEqual([-10, 0, null]);
  });
});

describe("formatLengthChange", () => {
  it("signs a gain and a loss", () => {
    expect(formatLengthChange(5)).toBe("+5");
    expect(formatLengthChange(-5)).toBe("-5");
  });
});

describe("getRevisionReasonLabel", () => {
  it("tells a restore backup from a discard backup by the version it restored", () => {
    expect(getRevisionReasonLabel("restore_backup", 3)).toBe(
      m.editor_history_reason_restore_backup(),
    );
    expect(getRevisionReasonLabel("restore_backup", null)).toBe(
      m.editor_history_reason_discard_backup(),
    );
    expect(getRevisionReasonLabel("publish", null)).toBe(
      m.editor_history_reason_publish(),
    );
  });
});
