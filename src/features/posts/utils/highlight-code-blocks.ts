import type { JSONContent } from "@tiptap/react";
import { fallbackCodeHtml } from "@/features/posts/utils/content";
import { highlight } from "@/lib/shiki";

export async function highlightCodeBlocks(
  doc: JSONContent,
): Promise<JSONContent> {
  const cloned = structuredClone(doc);

  async function traverse(node: JSONContent) {
    if (node.type === "codeBlock") {
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

  await traverse(cloned);
  return cloned;
}
