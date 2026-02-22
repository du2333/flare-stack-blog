import type { JSONContent } from "@tiptap/react";

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
  const { marked } = await import("marked");
  const html = await marked(markdown);

  const { getSchema } = await import("@tiptap/core");
  const { DOMParser: PMDOMParser } = await import("@tiptap/pm/model");
  const { parseHTML } = await import("linkedom");

  const { default: StarterKit } = await import("@tiptap/starter-kit");
  const { default: ImageExt } = await import("@tiptap/extension-image");
  const { Table } = await import("@tiptap/extension-table");
  const { default: TableRow } = await import("@tiptap/extension-table-row");
  const { default: TableHeader } =
    await import("@tiptap/extension-table-header");
  const { default: TableCell } = await import("@tiptap/extension-table-cell");

  const schema = getSchema([
    StarterKit,
    ImageExt,
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
