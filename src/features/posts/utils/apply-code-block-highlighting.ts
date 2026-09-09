import type { JSONContent } from "@tiptap/react";

function codeBlockText(node: JSONContent) {
  return node.content?.map((child) => child.text || "").join("") || "";
}

function codeBlockLang(node: JSONContent) {
  return String(node.attrs?.language || "text");
}

function codeBlockKey(node: JSONContent) {
  return `${codeBlockLang(node)}\0${codeBlockText(node)}`;
}

function collectHighlightedHtml(doc: JSONContent | null | undefined) {
  const map = new Map<string, Array<string>>();

  function walk(node: JSONContent) {
    if (node.type === "codeBlock") {
      const html = node.attrs?.highlightedHtml;
      if (typeof html === "string" && html.length > 0) {
        const key = codeBlockKey(node);
        const list = map.get(key) ?? [];
        list.push(html);
        map.set(key, list);
      }
    }
    node.content?.forEach(walk);
  }

  if (doc) walk(doc);
  return map;
}

function takeHtml(map: Map<string, Array<string>>, key: string) {
  const list = map.get(key);
  if (!list || list.length === 0) return undefined;
  return list.shift();
}

export function applyCodeBlockHighlighting(
  draft: JSONContent | null,
  fromSnapshot: JSONContent | null | undefined,
): JSONContent | null {
  if (!draft) return null;

  const snapshotHtml = collectHighlightedHtml(fromSnapshot);
  const cloned = structuredClone(draft);

  function walk(node: JSONContent) {
    if (node.type === "codeBlock") {
      const attrs = { ...node.attrs };
      delete attrs.highlightedHtml;
      const html = takeHtml(snapshotHtml, codeBlockKey(node));
      node.attrs = html ? { ...attrs, highlightedHtml: html } : attrs;
    }
    node.content?.forEach(walk);
  }

  walk(cloned);
  return cloned;
}
