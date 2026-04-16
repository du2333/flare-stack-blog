import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  buildContentDiffLines,
  buildRevisionFieldDiffs,
} from "./post-editor-history-diff.utils";

function text(value: string): JSONContent {
  return { type: "text", text: value };
}

function paragraph(value: string): JSONContent {
  return { type: "paragraph", content: [text(value)] };
}

function doc(...content: Array<JSONContent>): JSONContent {
  return { type: "doc", content };
}

describe("buildContentDiffLines", () => {
  it("builds inline word diff for changed lines", () => {
    const previous = doc(paragraph("hello old world"));
    const current = doc(paragraph("hello new world"));

    const lines = buildContentDiffLines(previous, current);

    expect(lines).toHaveLength(2);
    expect(lines[0]?.type).toBe("removed");
    expect(lines[1]?.type).toBe("added");
    expect(lines[0]?.tokens.some((token) => token.type === "removed")).toBe(
      true,
    );
    expect(lines[1]?.tokens.some((token) => token.type === "added")).toBe(true);
  });

  it("keeps context lines with both line numbers", () => {
    const previous = doc(paragraph("same"), paragraph("before"));
    const current = doc(paragraph("same"), paragraph("after"));

    const lines = buildContentDiffLines(previous, current);
    expect(lines[0]).toMatchObject({
      type: "context",
      oldLineNumber: 1,
      newLineNumber: 1,
    });
  });
});

describe("buildRevisionFieldDiffs", () => {
  it("returns changed metadata fields only", () => {
    const diffs = buildRevisionFieldDiffs(
      {
        title: "Old title",
        summary: null,
        slug: "old-title",
        status: "draft",
        publishedAt: null,
        readTimeInMinutes: 3,
        contentJson: null,
        tagIds: [1],
      },
      {
        title: "New title",
        summary: "Summary",
        slug: "new-title",
        status: "published",
        publishedAt: "2026-03-17T00:00:00.000Z",
        readTimeInMinutes: 5,
        contentJson: null,
        tagIds: [2],
      },
      [
        { id: 1, name: "old" },
        { id: 2, name: "new" },
      ],
    );

    expect(diffs.map((diff) => diff.field)).toEqual([
      "title",
      "summary",
      "slug",
      "status",
      "publishedAt",
      "readTime",
      "tags",
    ]);
  });
});
