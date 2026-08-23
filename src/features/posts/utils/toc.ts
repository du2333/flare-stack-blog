import type { JSONContent } from "@tiptap/react";
import { slugify } from "@/features/posts/utils/content";

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

export function clampHeadingLevel(level: unknown): 2 | 3 | 4 {
  const value = Number(level);
  if (!Number.isFinite(value) || value < 2) return 2;
  if (value > 4) return 4;
  return value as 2 | 3 | 4;
}

export function uniqueHeadingId(text: string, used: Set<string>) {
  const base = slugify(text) || "heading";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function getNodeText(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) {
    return node.content.map(getNodeText).join("");
  }
  return "";
}

function walkHeadings(
  node: JSONContent | undefined | null,
  visit: (heading: JSONContent) => void,
) {
  if (!node) return;
  if (node.type === "heading") {
    visit(node);
  }
  node.content?.forEach((child) => walkHeadings(child, visit));
}

export function generateTableOfContents(
  content: JSONContent | undefined | null,
) {
  const used = new Set<string>();
  const headings: Array<TableOfContentsItem> = [];

  walkHeadings(content, (node) => {
    const text = getNodeText(node);
    if (!text) return;
    headings.push({
      id: uniqueHeadingId(text, used),
      text,
      level: clampHeadingLevel(node.attrs?.level),
    });
  });

  return headings;
}

export function withUniqueHeadingIds(doc: JSONContent): JSONContent {
  const cloned = structuredClone(doc);
  const used = new Set<string>();

  walkHeadings(cloned, (node) => {
    const text = getNodeText(node);
    const level = clampHeadingLevel(node.attrs?.level);
    node.attrs = {
      ...node.attrs,
      level,
      id: text ? uniqueHeadingId(text, used) : undefined,
    };
  });

  return cloned;
}
