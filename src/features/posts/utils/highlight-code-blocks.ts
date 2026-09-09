import type { JSONContent } from "@tiptap/react";
import { applyCodeBlockHighlighting } from "@/features/posts/utils/apply-code-block-highlighting";
import { fallbackCodeHtml } from "@/features/posts/utils/content";
import { highlight } from "@/lib/shiki";

async function highlightMissingCodeBlocks(
  doc: JSONContent,
): Promise<JSONContent> {
  async function traverse(node: JSONContent) {
    if (node.type === "codeBlock") {
      const existing = node.attrs?.highlightedHtml;
      if (typeof existing === "string" && existing.length > 0) {
        if (node.content) {
          await Promise.all(node.content.map(traverse));
        }
        return;
      }

      const code = node.content?.map((n) => n.text || "").join("") || "";
      const lang = node.attrs?.language || "text";
      try {
        const html = await highlight(code, lang);
        node.attrs = { ...node.attrs, highlightedHtml: html };
      } catch (e) {
        console.warn(
          JSON.stringify({
            event: "code_highlight_failed",
            lang,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
        node.attrs = {
          ...node.attrs,
          highlightedHtml: fallbackCodeHtml(code),
        };
      }
    }
    if (node.content) {
      await Promise.all(node.content.map(traverse));
    }
  }

  await traverse(doc);
  return doc;
}

export async function highlightSnapshotContent(
  draft: JSONContent | null,
  fromSnapshot: JSONContent | null | undefined,
): Promise<JSONContent | null> {
  const reused = applyCodeBlockHighlighting(draft, fromSnapshot);
  if (!reused) return null;
  return highlightMissingCodeBlocks(reused);
}
