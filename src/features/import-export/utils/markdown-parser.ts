import type { JSONContent } from "@tiptap/react";

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Pre-process markdown: convert $...$ and $$...$$ to HTML elements
 * so that marked passes them through and DOMParser can parse them.
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
    .replace(/(`+)[\s\S]*?\1/g, (m) => savePlaceholder(m));

  // Block math first: $$...$$ (multiline)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    const trimmed = latex.trim();
    const escaped = escapeHtmlAttr(trimmed);
    return `<div data-type="block-math" data-latex="${escaped}"></div>`;
  });
  // Inline math: $...$ (no $ or newline inside)
  result = result.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
    const trimmed = latex.trim();

    const startsWithNumber = /^\d+([.,]\d+)?/.test(trimmed);
    const isPureNumber = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*$/.test(
      trimmed,
    );
    const hasRangeOrCurrencyWords = /\b(?:and|or|to|per|each)\b/i.test(trimmed);
    const hasEnglishWordsAfterNumber = /^\d+([.,]\d+)?\s+[a-zA-Z]+/.test(
      trimmed,
    );
    const hasNonLatexToken = /[^\d\s.,+\-*/=^_(){}\\a-zA-Z]/.test(trimmed);

    if (
      isPureNumber ||
      (startsWithNumber &&
        (hasRangeOrCurrencyWords ||
          hasEnglishWordsAfterNumber ||
          hasNonLatexToken))
    ) {
      return match; // leave as-is for currency/range-like text
    }

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

/**
 * Markdown → JSONContent 转换
 *
 * NOTE: @tiptap/html checks for browser (window) or Node (process.versions.node)
 * and neither is available in Cloudflare Workers. We bypass this by calling
 * ProseMirror's DOMParser directly with linkedom as the DOM implementation.
 */
export async function markdownToJsonContent(
  markdown: string,
): Promise<JSONContent> {
  const preprocessed = preprocessMathInMarkdown(markdown);

  const { marked } = await import("marked");
  const html = await marked(preprocessed);

  const { getSchema } = await import("@tiptap/core");
  const { DOMParser: PMDOMParser } = await import("@tiptap/pm/model");
  const { parseHTML } = await import("linkedom");

  const { default: StarterKit } = await import("@tiptap/starter-kit");
  const { default: ImageExt } = await import("@tiptap/extension-image");
  const { default: Mathematics } =
    await import("@tiptap/extension-mathematics");
  const { Table } = await import("@tiptap/extension-table");
  const { default: TableRow } = await import("@tiptap/extension-table-row");
  const { default: TableHeader } =
    await import("@tiptap/extension-table-header");
  const { default: TableCell } = await import("@tiptap/extension-table-cell");

  const schema = getSchema([
    StarterKit,
    ImageExt,
    Mathematics.configure({ katexOptions: { throwOnError: false } }),
    Table,
    TableRow,
    TableHeader,
    TableCell,
  ]);

  const { document } = parseHTML(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
  );

  return PMDOMParser.fromSchema(schema)
    .parse(document.body as unknown as Element)
    .toJSON() as JSONContent;
}
