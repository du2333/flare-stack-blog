import type { JSONContent } from "@tiptap/react";
import { clampHeadingLevel } from "@/features/posts/utils/toc";

export function parseImageSize(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    if (value.trim().endsWith("%")) return undefined;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export function normalizePostContent(
  doc: JSONContent | null | undefined,
): JSONContent | null {
  if (!doc) return null;
  const cloned = structuredClone(doc);

  function walk(node: JSONContent) {
    if (node.type === "heading") {
      node.attrs = {
        ...node.attrs,
        level: clampHeadingLevel(node.attrs?.level),
      };
    }

    if (node.type === "image" && node.attrs) {
      const {
        caption: _caption,
        align: _align,
        aspectRatio: _aspectRatio,
        uploadId: _uploadId,
        ...rest
      } = node.attrs;
      node.attrs = {
        ...rest,
        width: parseImageSize(rest.width) ?? null,
        height: parseImageSize(rest.height) ?? null,
      };
    }

    if (node.type === "codeBlock" && node.attrs) {
      const { highlightedHtml: _highlightedHtml, ...rest } = node.attrs;
      node.attrs = rest;
    }

    node.content?.forEach(walk);
  }

  walk(cloned);
  return cloned;
}
