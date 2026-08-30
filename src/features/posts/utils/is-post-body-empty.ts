import type { JSONContent } from "@tiptap/react";

const BODY_NODE_TYPES = new Set([
  "image",
  "codeBlock",
  "table",
  "inlineMath",
  "blockMath",
  "horizontalRule",
]);

export function isPostBodyEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc) return true;

  function walk(node: JSONContent): boolean {
    if (node.type && BODY_NODE_TYPES.has(node.type)) return false;
    if (typeof node.text === "string" && node.text.trim() !== "") return false;
    if (node.content) {
      for (const child of node.content) {
        if (!walk(child)) return false;
      }
    }
    return true;
  }

  return walk(doc);
}
