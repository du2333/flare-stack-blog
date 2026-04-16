import type { JSONContent } from "@tiptap/react";
import { diffLines, diffWords } from "diff";
import { jsonContentToMarkdown } from "@/features/import-export/utils/markdown-serializer";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";

export interface DiffToken {
  type: "context" | "added" | "removed";
  value: string;
}

export interface DiffLine {
  type: "context" | "added" | "removed";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  tokens: Array<DiffToken>;
}

export interface RevisionFieldDiff {
  field: RevisionFieldKey;
  previousValue: string;
  currentValue: string;
}

export type RevisionFieldKey =
  | "title"
  | "summary"
  | "slug"
  | "status"
  | "publishedAt"
  | "readTime"
  | "tags";

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function splitLines(value: string) {
  if (!value) return [];

  const normalized = normalizeLineEndings(value);
  const parts = normalized.split("\n");
  if (parts.at(-1) === "") {
    parts.pop();
  }
  return parts;
}

function toMarkdown(doc: JSONContent | null) {
  if (!doc) return "";
  return jsonContentToMarkdown(doc);
}

function buildWordTokens(
  previousValue: string,
  currentValue: string,
): {
  removedTokens: Array<DiffToken>;
  addedTokens: Array<DiffToken>;
} {
  const changes = diffWords(previousValue, currentValue);

  return changes.reduce(
    (acc, change) => {
      if (!change.added) {
        acc.removedTokens.push({
          type: change.removed ? "removed" : "context",
          value: change.value,
        });
      }

      if (!change.removed) {
        acc.addedTokens.push({
          type: change.added ? "added" : "context",
          value: change.value,
        });
      }

      return acc;
    },
    {
      removedTokens: [] as Array<DiffToken>,
      addedTokens: [] as Array<DiffToken>,
    },
  );
}

function createPlainTokens(
  value: string,
  type: DiffLine["type"],
): Array<DiffToken> {
  return [{ type: type === "context" ? "context" : type, value }];
}

export function buildContentDiffLines(
  previousDoc: JSONContent | null,
  currentDoc: JSONContent | null,
): Array<DiffLine> {
  const previousMarkdown = toMarkdown(previousDoc);
  const currentMarkdown = toMarkdown(currentDoc);
  const changes = diffLines(previousMarkdown, currentMarkdown, {
    newlineIsToken: false,
    ignoreWhitespace: false,
  });

  const lines: Array<DiffLine> = [];
  let oldLineNumber = 1;
  let newLineNumber = 1;

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];

    if (!change) continue;

    if (change.removed && changes[index + 1]?.added) {
      const nextChange = changes[index + 1];
      const removedLines = splitLines(change.value);
      const addedLines = splitLines(nextChange.value);
      const pairedLength = Math.max(removedLines.length, addedLines.length);

      for (let lineIndex = 0; lineIndex < pairedLength; lineIndex += 1) {
        const removedLine = removedLines[lineIndex];
        const addedLine = addedLines[lineIndex];

        if (removedLine != null && addedLine != null) {
          const tokens = buildWordTokens(removedLine, addedLine);
          lines.push({
            type: "removed",
            oldLineNumber,
            newLineNumber: null,
            tokens: tokens.removedTokens,
          });
          lines.push({
            type: "added",
            oldLineNumber: null,
            newLineNumber,
            tokens: tokens.addedTokens,
          });
          oldLineNumber += 1;
          newLineNumber += 1;
          continue;
        }

        if (removedLine != null) {
          lines.push({
            type: "removed",
            oldLineNumber,
            newLineNumber: null,
            tokens: createPlainTokens(removedLine, "removed"),
          });
          oldLineNumber += 1;
        }

        if (addedLine != null) {
          lines.push({
            type: "added",
            oldLineNumber: null,
            newLineNumber,
            tokens: createPlainTokens(addedLine, "added"),
          });
          newLineNumber += 1;
        }
      }

      index += 1;
      continue;
    }

    if (change.added) {
      const addedLines = splitLines(change.value);
      for (const addedLine of addedLines) {
        lines.push({
          type: "added",
          oldLineNumber: null,
          newLineNumber,
          tokens: createPlainTokens(addedLine, "added"),
        });
        newLineNumber += 1;
      }
      continue;
    }

    if (change.removed) {
      const removedLines = splitLines(change.value);
      for (const removedLine of removedLines) {
        lines.push({
          type: "removed",
          oldLineNumber,
          newLineNumber: null,
          tokens: createPlainTokens(removedLine, "removed"),
        });
        oldLineNumber += 1;
      }
      continue;
    }

    const contextLines = splitLines(change.value);
    for (const contextLine of contextLines) {
      lines.push({
        type: "context",
        oldLineNumber,
        newLineNumber,
        tokens: createPlainTokens(contextLine, "context"),
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  return lines;
}

function normalizeText(value: string | null | undefined, fallback = "Empty") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizePublishedAt(value: string | null) {
  return value ?? "Unpublished";
}

function normalizeTagIds(tagIds: Array<number>, tagMap: Map<number, string>) {
  if (tagIds.length === 0) return "No tags";

  return [...new Set(tagIds)]
    .sort((a, b) => a - b)
    .map((tagId) => tagMap.get(tagId) ?? `#${tagId}`)
    .join(", ");
}

export function buildRevisionFieldDiffs(
  previousSnapshot: PostRevisionSnapshot,
  currentSnapshot: PostRevisionSnapshot,
  allTags: Array<{ id: number; name: string }>,
): Array<RevisionFieldDiff> {
  const tagMap = new Map(allTags.map((tag) => [tag.id, tag.name]));

  const fields = [
    {
      field: "title" as const,
      previousValue: normalizeText(previousSnapshot.title),
      currentValue: normalizeText(currentSnapshot.title),
    },
    {
      field: "summary" as const,
      previousValue: normalizeText(previousSnapshot.summary),
      currentValue: normalizeText(currentSnapshot.summary),
    },
    {
      field: "slug" as const,
      previousValue: normalizeText(previousSnapshot.slug),
      currentValue: normalizeText(currentSnapshot.slug),
    },
    {
      field: "status" as const,
      previousValue: previousSnapshot.status,
      currentValue: currentSnapshot.status,
    },
    {
      field: "publishedAt" as const,
      previousValue: normalizePublishedAt(previousSnapshot.publishedAt),
      currentValue: normalizePublishedAt(currentSnapshot.publishedAt),
    },
    {
      field: "readTime" as const,
      previousValue: `${previousSnapshot.readTimeInMinutes} min`,
      currentValue: `${currentSnapshot.readTimeInMinutes} min`,
    },
    {
      field: "tags" as const,
      previousValue: normalizeTagIds(previousSnapshot.tagIds, tagMap),
      currentValue: normalizeTagIds(currentSnapshot.tagIds, tagMap),
    },
  ];

  return fields.filter((field) => field.previousValue !== field.currentValue);
}
