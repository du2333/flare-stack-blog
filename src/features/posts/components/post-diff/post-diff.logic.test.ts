import { describe, expect, it } from "vitest";
import {
  collapseRows,
  type DiffRow,
  diffMarkdown,
  fieldChanges,
  hasBodyChange,
  markdownLines,
} from "./post-diff.logic";
import type { PostDiffSide } from "./post-diff.types";

/** The changed text of a row, joined. */
function marked(row: DiffRow) {
  return (row.segments ?? [])
    .filter((segment) => segment.changed)
    .map((segment) => segment.text);
}

function changedRows(rows: ReadonlyArray<DiffRow>) {
  return rows.filter((row) => row.kind !== "same");
}

describe("markdownLines", () => {
  it("unifies line endings and drops only the newline that ends the last line", () => {
    expect(markdownLines("a\r\nb\r\n")).toEqual(["a", "b"]);
    expect(markdownLines("a\nb")).toEqual(["a", "b"]);
    // A blank line the body really has stays.
    expect(markdownLines("a\n\n")).toEqual(["a", ""]);
  });

  it("reads an empty or missing body as no lines", () => {
    expect(markdownLines(null)).toEqual([]);
    expect(markdownLines("")).toEqual([]);
    expect(markdownLines("\n")).toEqual([]);
  });
});

describe("diffMarkdown", () => {
  it("finds no change in equal bodies", () => {
    const rows = diffMarkdown("# 标题\n\n正文", "# 标题\n\n正文\n");
    expect(hasBodyChange(rows)).toBe(false);
    expect(rows.map((row) => row.kind)).toEqual(["same", "same", "same"]);
  });

  it("treats a missing body and an empty one alike", () => {
    expect(hasBodyChange(diffMarkdown(null, ""))).toBe(false);
  });

  it("marks one changed word in a Chinese paragraph, not the line", () => {
    const rows = diffMarkdown(
      "前言\n\n今天我们讨论一下文章的修订历史功能，它会保存每次发布的版本。\n\n结尾",
      "前言\n\n今天我们讨论一下文章的版本历史功能，它会保存每次发布的版本。\n\n结尾",
    );
    const changed = changedRows(rows);
    expect(changed.map((row) => row.kind)).toEqual(["removed", "added"]);
    expect(marked(changed[0]!)).toEqual(["修订"]);
    expect(marked(changed[1]!)).toEqual(["版本"]);
    // The rest of the sentence stays unmarked on both sides.
    expect(changed[0]!.segments!.map((s) => s.text).join("")).toBe(
      changed[0]!.text,
    );
    expect(changed[1]!.segments!.map((s) => s.text).join("")).toBe(
      changed[1]!.text,
    );
  });

  it("marks one changed word in an English sentence", () => {
    const rows = diffMarkdown(
      "The quick brown fox jumps over the lazy dog.",
      "The quick red fox jumps over the lazy dog.",
    );
    const changed = changedRows(rows);
    expect(marked(changed[0]!)).toEqual(["brown"]);
    expect(marked(changed[1]!)).toEqual(["red"]);
  });

  it("marks only the changed line of a fenced code block", () => {
    const before = [
      "```ts",
      "const a = 1;",
      "const total = items.reduce((x, y) => x + y.price, 0);",
      "const c = 3;",
      "```",
    ].join("\n");
    const after = before.replace("y.price", "y.cost");
    const rows = diffMarkdown(before, after);
    const changed = changedRows(rows);
    expect(changed).toHaveLength(2);
    expect(changed[0]).toMatchObject({ kind: "removed" });
    expect(changed[0]!.text).toContain("y.price");
    expect(changed[1]!.text).toContain("y.cost");
    expect(marked(changed[0]!)).toEqual(["price"]);
    expect(marked(changed[1]!)).toEqual(["cost"]);
    // The fence and the other lines are unchanged rows.
    expect(rows.filter((row) => row.kind === "same")).toHaveLength(4);
  });

  it("marks the changed cell of a table row", () => {
    const rows = diffMarkdown(
      "| 名称 | 价格 | 数量 |\n| --- | --- | --- |\n| 苹果 | 3 | 10 |",
      "| 名称 | 单价 | 数量 |\n| --- | --- | --- |\n| 苹果 | 3 | 10 |",
    );
    const changed = changedRows(rows);
    expect(changed).toHaveLength(2);
    expect(changed[0]!.text).toBe("| 名称 | 价格 | 数量 |");
    expect(marked(changed[0]!)).toEqual(["格"]);
    expect(marked(changed[1]!)).toEqual(["单"]);
    expect(rows.filter((row) => row.kind === "same")).toHaveLength(2);
  });

  it("compares an image line by its text", () => {
    const rows = diffMarkdown(
      "![封面](/images/a1b2.png)",
      "![封面图](/images/a1b2.png)",
    );
    const changed = changedRows(rows);
    expect(marked(changed[0]!)).toEqual([]);
    expect(marked(changed[1]!)).toEqual(["图"]);
  });

  it("shows removed lines before added ones and keeps a line without a counterpart whole", () => {
    const rows = diffMarkdown("one\ntwo\nthree", "one\nthree\nfour");
    expect(rows.map((row) => `${row.kind}:${row.text}`)).toEqual([
      "same:one",
      "removed:two",
      "same:three",
      "added:four",
    ]);
    expect(rows[1]!.segments).toBeNull();
  });

  it("leaves a rewritten line unpaired when almost nothing is shared", () => {
    const rows = diffMarkdown("这是一个完全不同的句子", "xyz abc 123");
    const changed = changedRows(rows);
    expect(changed.map((row) => row.kind)).toEqual(["removed", "added"]);
    expect(changed[0]!.segments).toBeNull();
    expect(changed[1]!.segments).toBeNull();
  });

  it("marks inside a line only when it is like the line it stands against", () => {
    // Two lines changed, nothing alike.
    const plain = changedRows(diffMarkdown("苹果\n香蕉", "qwerty\nasdfgh"));
    expect(plain.map((row) => row.segments)).toEqual([null, null, null, null]);

    // A hunk too large to compare each line with each: by position, and only
    // the alike pair is marked.
    const removed = Array.from({ length: 21 }, (_, i) => `原文第${i}行：苹果`);
    const added = Array.from({ length: 21 }, (_, i) => `qwerty ${i}`);
    removed[5] = "今天天气很好适合出门散步";
    added[5] = "今天天气很好适合出门跑步";
    const rows = changedRows(
      diffMarkdown(removed.join("\n"), added.join("\n")),
    );
    const withMarks = rows.filter((row) => row.segments !== null);
    expect(withMarks).toHaveLength(2);
    expect(withMarks.map((row) => row.text)).toEqual([removed[5], added[5]]);
  });

  it("pairs lines of a larger hunk by similarity, in order", () => {
    const rows = diffMarkdown(
      "第一段话需要改动\n完全无关的旧内容\n第三段话也要改",
      "第一段话需要修改\n第三段话也要修改\n新增的一行",
    );
    const changed = changedRows(rows);
    const removed = changed.filter((row) => row.kind === "removed");
    const added = changed.filter((row) => row.kind === "added");
    // Each rewritten line stands against its own counterpart; the unrelated
    // old line has none.
    expect(removed[0]!.segments).not.toBeNull();
    expect(added[0]!.segments).not.toBeNull();
    expect(marked(removed[0]!).join("")).not.toContain("第一段");
    expect(removed[1]!.segments).toBeNull();
    expect(removed[2]!.segments).not.toBeNull();
    expect(added[1]!.segments).not.toBeNull();
    expect(marked(added[1]!).join("")).toContain("修");
    expect(added[2]!.segments).toBeNull();
  });
});

describe("collapseRows", () => {
  const same = (n: number): DiffRow => ({
    kind: "same",
    text: `line ${n}`,
    segments: null,
  });
  const changed: DiffRow = { kind: "added", text: "new", segments: null };

  it("keeps three lines around a change and folds the rest", () => {
    // 10 lines, a change, 10 lines.
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => same(i)),
      changed,
      ...Array.from({ length: 10 }, (_, i) => same(i + 10)),
    ];
    const items = collapseRows(rows);
    expect(items[0]).toEqual({ type: "fold", start: 0, count: 7 });
    const shown = items.filter((item) => item.type === "row");
    // 3 before, the change, 3 after.
    expect(shown).toHaveLength(7);
    expect(items.at(-1)).toEqual({ type: "fold", start: 14, count: 7 });
  });

  it("folds the run between two changes with context on both ends", () => {
    const rows = [
      changed,
      ...Array.from({ length: 12 }, (_, i) => same(i)),
      changed,
    ];
    const items = collapseRows(rows);
    expect(items.map((item) => item.type)).toEqual([
      "row",
      "row",
      "row",
      "row",
      "fold",
      "row",
      "row",
      "row",
      "row",
    ]);
    expect(items[4]).toEqual({ type: "fold", start: 4, count: 6 });
  });

  it("does not fold a run that would hide a single line", () => {
    const rows = [
      changed,
      ...Array.from({ length: 7 }, (_, i) => same(i)),
      changed,
    ];
    expect(collapseRows(rows).every((item) => item.type === "row")).toBe(true);
  });

  it("shows the lines of an expanded fold", () => {
    const rows = [...Array.from({ length: 10 }, (_, i) => same(i)), changed];
    const folded = collapseRows(rows);
    expect(folded[0]).toEqual({ type: "fold", start: 0, count: 7 });
    const expanded = collapseRows(rows, { expanded: new Set([0]) });
    expect(expanded.every((item) => item.type === "row")).toBe(true);
    expect(expanded).toHaveLength(rows.length);
  });

  it("takes the context from the caller", () => {
    const rows = [...Array.from({ length: 10 }, (_, i) => same(i)), changed];
    expect(collapseRows(rows, { context: 1 })[0]).toEqual({
      type: "fold",
      start: 0,
      count: 9,
    });
  });
});

describe("fieldChanges", () => {
  const side: PostDiffSide = {
    title: "标题",
    summary: "摘要",
    slug: "a-post",
    publishedAt: "2026-05-01T00:00:00.000Z",
    categoryId: 1,
    tagIds: [1, 2],
    coverMediaId: 5,
    coverUrl: null,
    markdown: "正文",
  };
  const lookups = {
    categories: [
      { id: 1, name: "技术" },
      { id: 2, name: "生活" },
    ],
    tags: [
      { id: 1, name: "TypeScript" },
      { id: 2, name: "React" },
      { id: 3, name: "Bun" },
    ],
  };

  it("lists nothing for equal sides, however the date and tags are written", () => {
    expect(
      fieldChanges(
        side,
        {
          ...side,
          publishedAt: new Date("2026-05-01T00:00:00.000Z"),
          tagIds: [2, 1],
          summary: null,
        },
        lookups,
      ).map((change) => change.field),
    ).toEqual(["summary"]);
    expect(fieldChanges(side, { ...side, tagIds: [2, 1] }, lookups)).toEqual(
      [],
    );
  });

  it("lists each differing field in the editor's order", () => {
    const changes = fieldChanges(
      side,
      {
        ...side,
        title: "新标题",
        slug: "b-post",
        publishedAt: null,
        categoryId: 2,
        tagIds: [3],
        coverMediaId: null,
      },
      lookups,
    );
    expect(changes.map((change) => change.field)).toEqual([
      "title",
      "slug",
      "publishedAt",
      "category",
      "tags",
      "cover",
    ]);
    expect(changes[0]).toMatchObject({
      before: { kind: "text", text: "标题" },
      after: { kind: "text", text: "新标题" },
    });
    expect(changes[2]).toMatchObject({
      before: { kind: "date", time: Date.parse("2026-05-01T00:00:00.000Z") },
      after: { kind: "date", time: null },
    });
    expect(changes[3]).toMatchObject({
      before: { kind: "category", category: { id: 1, name: "技术" } },
      after: { kind: "category", category: { id: 2, name: "生活" } },
    });
  });

  it("names a category and tags that no longer exist as deleted (null name)", () => {
    const changes = fieldChanges(
      { ...side, categoryId: 9, tagIds: [1, 8] },
      { ...side, categoryId: null, tagIds: [1] },
      lookups,
    );
    const category = changes.find((change) => change.field === "category")!;
    expect(category.before).toEqual({
      kind: "category",
      category: { id: 9, name: null },
    });
    expect(category.after).toEqual({ kind: "category", category: null });
    const tags = changes.find((change) => change.field === "tags")!;
    expect(tags.before).toEqual({
      kind: "tags",
      tags: [
        { id: 1, name: "TypeScript" },
        { id: 8, name: null },
      ],
    });
  });

  it("carries the cover addresses the caller knows", () => {
    const changes = fieldChanges(
      { ...side, coverUrl: "/images/a.png" },
      { ...side, coverMediaId: null, coverUrl: null },
      lookups,
    );
    expect(changes).toEqual([
      {
        field: "cover",
        before: { kind: "cover", id: 5, url: "/images/a.png" },
        after: { kind: "cover", id: null, url: null },
      },
    ]);
  });

  it("compares the title and the summary exactly, spaces included", () => {
    const changes = fieldChanges(
      side,
      { ...side, title: "标题 ", summary: " 摘要" },
      lookups,
    );
    expect(changes.map((change) => change.field)).toEqual(["title", "summary"]);
    // No summary is the same as an empty one.
    expect(
      fieldChanges(
        { ...side, summary: null },
        { ...side, summary: "" },
        lookups,
      ),
    ).toEqual([]);
  });

  it("lists the publish date only when the calendar day differs", () => {
    const sameDay = new Date(side.publishedAt as string);
    sameDay.setHours(sameDay.getHours() === 0 ? 1 : 0, 30);
    const nextDay = new Date(side.publishedAt as string);
    nextDay.setDate(nextDay.getDate() + 1);
    expect(
      fieldChanges(side, { ...side, publishedAt: sameDay }, lookups),
    ).toEqual([]);
    expect(
      fieldChanges(side, { ...side, publishedAt: nextDay }, lookups).map(
        (change) => change.field,
      ),
    ).toEqual(["publishedAt"]);
  });

  it("does not list the body", () => {
    expect(
      fieldChanges(side, { ...side, markdown: "另一段" }, lookups),
    ).toEqual([]);
  });
});
