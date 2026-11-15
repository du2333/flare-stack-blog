import { diffArrays, diffChars, diffWordsWithSpace } from "diff";
import type { PostDiffSide } from "./post-diff.types";

/** The unchanged lines kept around each change; the rest fold away. */
export const DIFF_CONTEXT_LINES = 3;

/** A folded run of fewer unchanged lines than this is shown, not folded. */
const MIN_FOLDED_LINES = 2;

/** How much of two lines must be shared before the text inside is compared. */
const MIN_LINE_SIMILARITY = 0.35;

/** Hunks larger than this (removed x added lines) are paired by position only. */
const MAX_PAIRING_WORK = 400;

const LINE_DIFF_TIMEOUT_MS = 3000;

export interface InlineSegment {
  text: string;
  changed: boolean;
}

export interface DiffRow {
  kind: "same" | "removed" | "added";
  text: string;
  /**
   * The line cut into runs, the changed ones marked. Null when the whole line
   * stands as one run: an unchanged line, or a changed line with no
   * counterpart on the other side.
   */
  segments: Array<InlineSegment> | null;
}

export type DiffItem =
  | { type: "row"; index: number; row: DiffRow }
  | {
      type: "fold";
      /** Index in the rows of the first hidden line; names the fold. */
      start: number;
      count: number;
    };

/** The lines of a Markdown body: line endings unified, no trailing blank lines. */
export function markdownLines(markdown: string | null | undefined) {
  const text = (markdown ?? "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  return text === "" ? [] : text.split("\n");
}

/**
 * Words for the languages that cut them with spaces, and the dictionary's
 * words for Chinese and Japanese, which write none: a word diff treating a
 * whole Chinese sentence as one token would mark the whole line.
 */
function wordSegmenter() {
  return typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("zh", { granularity: "word" })
    : null;
}

interface InlineDiff {
  before: Array<InlineSegment>;
  after: Array<InlineSegment>;
  /** Share of the two lines that is the same, 0 to 1. */
  similarity: number;
}

function mergeSegments(segments: Array<InlineSegment>) {
  const merged: Array<InlineSegment> = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.changed === segment.changed) last.text += segment.text;
    else merged.push({ ...segment });
  }
  return merged;
}

function inlineDiff(
  before: string,
  after: string,
  segmenter: Intl.Segmenter | null,
): InlineDiff {
  const changes = segmenter
    ? diffWordsWithSpace(before, after, { intlSegmenter: segmenter })
    : diffChars(before, after);
  const beforeSegments: Array<InlineSegment> = [];
  const afterSegments: Array<InlineSegment> = [];
  let same = 0;
  for (const change of changes) {
    if (change.added) {
      afterSegments.push({ text: change.value, changed: true });
    } else if (change.removed) {
      beforeSegments.push({ text: change.value, changed: true });
    } else {
      beforeSegments.push({ text: change.value, changed: false });
      afterSegments.push({ text: change.value, changed: false });
      same += change.value.replace(/\s/g, "").length;
    }
  }
  const total =
    before.replace(/\s/g, "").length + after.replace(/\s/g, "").length;
  return {
    before: mergeSegments(beforeSegments),
    after: mergeSegments(afterSegments),
    similarity: total === 0 ? 1 : (2 * same) / total,
  };
}

/**
 * Which added line each removed line of one hunk stands against, by index
 * (null for none). A line pairs with the first later line that is similar
 * enough; the order of both sides is kept.
 */
function pairLines(
  removed: ReadonlyArray<string>,
  added: ReadonlyArray<string>,
  segmenter: Intl.Segmenter | null,
): Array<{ removed: number; added: number; diff: InlineDiff }> {
  if (removed.length === 0 || added.length === 0) return [];
  const pairs: Array<{ removed: number; added: number; diff: InlineDiff }> = [];
  if (removed.length * added.length > MAX_PAIRING_WORK) {
    if (removed.length !== added.length) return pairs;
    removed.forEach((line, index) => {
      pairs.push({
        removed: index,
        added: index,
        diff: inlineDiff(line, added[index]!, segmenter),
      });
    });
    return pairs;
  }
  let from = 0;
  for (let i = 0; i < removed.length && from < added.length; i++) {
    let best: { added: number; diff: InlineDiff } | null = null;
    for (let j = from; j < added.length; j++) {
      const diff = inlineDiff(removed[i]!, added[j]!, segmenter);
      if (
        diff.similarity >= MIN_LINE_SIMILARITY &&
        (best === null || diff.similarity > best.diff.similarity)
      ) {
        best = { added: j, diff };
        if (diff.similarity === 1) break;
      }
    }
    if (best) {
      pairs.push({ removed: i, added: best.added, diff: best.diff });
      from = best.added + 1;
    }
  }
  return pairs;
}

/**
 * The line diff of two Markdown bodies, oldest side first: every line of
 * both, the unchanged ones once. In a run of changes the removed lines come
 * before the added ones, and a removed line that has a similar added line
 * marks the changed text inside both.
 */
export function diffMarkdown(
  before: string | null | undefined,
  after: string | null | undefined,
): Array<DiffRow> {
  const beforeLines = markdownLines(before);
  const afterLines = markdownLines(after);
  const changes = diffArrays(beforeLines, afterLines, {
    timeout: LINE_DIFF_TIMEOUT_MS,
  });
  const segmenter = wordSegmenter();
  const rows: Array<DiffRow> = [];

  if (changes === undefined) {
    // Too different to compare in reasonable time: the whole body changed.
    for (const text of beforeLines) {
      rows.push({ kind: "removed", text, segments: null });
    }
    for (const text of afterLines) {
      rows.push({ kind: "added", text, segments: null });
    }
    return rows;
  }

  let removed: Array<string> = [];
  const flush = (added: ReadonlyArray<string>) => {
    const removedRows: Array<DiffRow> = removed.map((text) => ({
      kind: "removed",
      text,
      segments: null,
    }));
    const addedRows: Array<DiffRow> = added.map((text) => ({
      kind: "added",
      text,
      segments: null,
    }));
    for (const pair of pairLines(removed, added, segmenter)) {
      removedRows[pair.removed]!.segments = pair.diff.before;
      addedRows[pair.added]!.segments = pair.diff.after;
    }
    rows.push(...removedRows, ...addedRows);
    removed = [];
  };

  for (const change of changes) {
    if (change.removed) {
      removed = change.value;
    } else if (change.added) {
      flush(change.value);
    } else {
      if (removed.length > 0) flush([]);
      for (const text of change.value) {
        rows.push({ kind: "same", text, segments: null });
      }
    }
  }
  if (removed.length > 0) flush([]);
  return rows;
}

export function hasBodyChange(rows: ReadonlyArray<DiffRow>) {
  return rows.some((row) => row.kind !== "same");
}

/**
 * The rows to show: every changed line with `context` unchanged lines on each
 * side, and a fold for each longer run of unchanged lines between them. A
 * fold named in `expanded` (by its `start`) shows its lines instead.
 */
export function collapseRows(
  rows: ReadonlyArray<DiffRow>,
  options: { context?: number; expanded?: ReadonlySet<number> } = {},
): Array<DiffItem> {
  const context = options.context ?? DIFF_CONTEXT_LINES;
  const expanded = options.expanded ?? new Set<number>();
  const items: Array<DiffItem> = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index]!.kind !== "same") {
      items.push({ type: "row", index, row: rows[index]! });
      index++;
      continue;
    }
    let end = index;
    while (end < rows.length && rows[end]!.kind === "same") end++;
    // The run keeps `context` lines next to a change, none at the ends of the
    // body.
    const keepBefore = index === 0 ? 0 : context;
    const keepAfter = end === rows.length ? 0 : context;
    const hidden = end - index - keepBefore - keepAfter;
    const fold =
      hidden >= MIN_FOLDED_LINES && !expanded.has(index + keepBefore);
    for (let i = index; i < end; i++) {
      if (fold && i >= index + keepBefore && i < end - keepAfter) {
        if (i === index + keepBefore) {
          items.push({ type: "fold", start: i, count: hidden });
        }
        continue;
      }
      items.push({ type: "row", index: i, row: rows[i]! });
    }
    index = end;
  }
  return items;
}

export type FieldKey =
  | "title"
  | "summary"
  | "slug"
  | "publishedAt"
  | "category"
  | "tags"
  | "cover";

export interface NamedItem {
  id: number;
  name: string;
}

export interface FieldLookups {
  categories: ReadonlyArray<NamedItem>;
  tags: ReadonlyArray<NamedItem>;
}

/** A category or tag by its name; the name is null for one that is gone. */
export interface NamedRef {
  id: number;
  name: string | null;
}

export type FieldValue =
  | { kind: "text"; text: string }
  | { kind: "date"; time: number | null }
  | { kind: "category"; category: NamedRef | null }
  | { kind: "tags"; tags: Array<NamedRef> }
  | { kind: "cover"; id: number | null; url: string | null };

export interface FieldChange {
  field: FieldKey;
  before: FieldValue;
  after: FieldValue;
}

function timeOf(value: string | Date | null | undefined) {
  if (value == null || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function sameIds(a: ReadonlyArray<number>, b: ReadonlyArray<number>) {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort((x, y) => x - y);
  return [...a].sort((x, y) => x - y).every((id, i) => id === sortedB[i]);
}

/**
 * The fields that differ between two states of a Post, in the order the
 * editor lists them. A category or tag is compared by id and named from
 * `lookups`; one the lookups lack has been deleted.
 */
export function fieldChanges(
  before: PostDiffSide,
  after: PostDiffSide,
  lookups: FieldLookups,
): Array<FieldChange> {
  const changes: Array<FieldChange> = [];
  const text = (field: FieldKey, a: string, b: string) => {
    if (a !== b) {
      changes.push({
        field,
        before: { kind: "text", text: a },
        after: { kind: "text", text: b },
      });
    }
  };
  text("title", before.title.trim(), after.title.trim());
  text("summary", (before.summary ?? "").trim(), (after.summary ?? "").trim());
  text("slug", before.slug, after.slug);

  const beforeTime = timeOf(before.publishedAt);
  const afterTime = timeOf(after.publishedAt);
  if (beforeTime !== afterTime) {
    changes.push({
      field: "publishedAt",
      before: { kind: "date", time: beforeTime },
      after: { kind: "date", time: afterTime },
    });
  }

  if (before.categoryId !== after.categoryId) {
    const category = (id: number | null) =>
      id === null
        ? null
        : {
            id,
            name:
              lookups.categories.find((item) => item.id === id)?.name ?? null,
          };
    changes.push({
      field: "category",
      before: { kind: "category", category: category(before.categoryId) },
      after: { kind: "category", category: category(after.categoryId) },
    });
  }

  if (!sameIds(before.tagIds, after.tagIds)) {
    const tags = (ids: ReadonlyArray<number>) =>
      ids.map((id) => ({
        id,
        name: lookups.tags.find((item) => item.id === id)?.name ?? null,
      }));
    changes.push({
      field: "tags",
      before: { kind: "tags", tags: tags(before.tagIds) },
      after: { kind: "tags", tags: tags(after.tagIds) },
    });
  }

  if (before.coverMediaId !== after.coverMediaId) {
    changes.push({
      field: "cover",
      before: {
        kind: "cover",
        id: before.coverMediaId,
        url: before.coverUrl ?? null,
      },
      after: {
        kind: "cover",
        id: after.coverMediaId,
        url: after.coverUrl ?? null,
      },
    });
  }
  return changes;
}

/** Whether the two states differ in any field or in the body. */
export function hasPostChange(
  fields: ReadonlyArray<FieldChange>,
  rows: ReadonlyArray<DiffRow>,
) {
  return fields.length > 0 || hasBodyChange(rows);
}
