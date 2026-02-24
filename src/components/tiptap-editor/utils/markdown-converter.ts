import type { JSONContent } from "@tiptap/react";
import { jsonContentToMarkdown } from "@/features/import-export/utils/markdown-serializer";

export type EditorMode = "wysiwyg" | "markdown";

/**
 * JSONContent → Markdown string
 * Reuses the serializer from import-export (pure function, no server deps).
 */
export function jsonToMarkdown(json: JSONContent | null): string {
  if (!json) return "";
  return jsonContentToMarkdown(json);
}

/**
 * Pre-process markdown: convert $...$ and $$...$$ to HTML elements
 * so that marked passes them through and Tiptap/ProseMirror can parse them.
 *
 * Adapted from import-export/utils/markdown-parser.ts for client-side use.
 */
function preprocessMathInMarkdown(markdown: string): string {
  const placeholders: Array<string> = [];
  const savePlaceholder = (raw: string): string => {
    const idx = placeholders.push(raw) - 1;
    return `\u0000MATH_PLACEHOLDER_${idx}\u0000`;
  };

  // Protect code regions first to avoid replacing math syntax inside code.
  let result = markdown
    .replace(/~~~[\s\S]*?~~~/g, (m) => savePlaceholder(m))
    .replace(/```[\s\S]*?```/g, (m) => savePlaceholder(m))
    .replace(/(`+)[\s\S]*?\1/g, (m) => savePlaceholder(m));

  // Block math: $$...$$ (multiline)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    const trimmed = (latex as string).trim();
    const escaped = escapeHtmlAttr(trimmed);
    return `<div data-type="block-math" data-latex="${escaped}"></div>`;
  });

  // Inline math: $...$ (no $ or newline inside)
  result = result.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
    const trimmed = (latex as string).trim();
    const isPureNumber = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*$/.test(
      trimmed,
    );
    if (isPureNumber) return match;

    const escaped = escapeHtmlAttr(trimmed);
    return `<span data-type="inline-math" data-latex="${escaped}"></span>`;
  });

  let restored = result;
  placeholders.forEach((value, idx) => {
    restored = restored.replaceAll(
      `\u0000MATH_PLACEHOLDER_${idx}\u0000`,
      value,
    );
  });
  return restored;
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Markdown → HTML string (client-side, for feeding into Tiptap editor.setContent)
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const preprocessed = preprocessMathInMarkdown(markdown);
  const { marked } = await import("marked");

  // 配置 marked 保留 guitar-pro 自定义标签
  const renderer = new marked.Renderer();
  const originalHtml = renderer.html;
  renderer.html = function (token) {
    // guitar-pro 标签直接保留
    if (typeof token === "object" && "raw" in token) {
      const raw = (token as { raw: string }).raw;
      if (raw.includes("<guitar-pro")) return raw;
    }
    return originalHtml.call(this, token);
  };

  return await marked(preprocessed, { renderer });
}
