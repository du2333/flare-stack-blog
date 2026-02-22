import type { JSONContent } from "@tiptap/react";
import { extractImageKey } from "@/features/media/media.utils";

/**
 * 替换 JSONContent 中所有图片的 src 路径
 * @param doc TipTap JSONContent
 * @param rewriteMap 旧 key → 新 key 的映射
 * @returns 新的 JSONContent（深拷贝，不修改原对象）
 */
export function rewriteImagePaths(
  doc: JSONContent,
  rewriteMap: Map<string, string>,
): JSONContent {
  const cloned = structuredClone(doc);

  function traverse(node: JSONContent) {
    if (node.type === "image" && node.attrs?.src) {
      const oldKey = extractImageKey(node.attrs.src as string);
      if (oldKey && rewriteMap.has(oldKey)) {
        const newKey = rewriteMap.get(oldKey)!;
        node.attrs.src = `/images/${newKey}?quality=80`;
      }
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  }

  traverse(cloned);
  return cloned;
}

/**
 * 提取 Markdown 中的图片引用
 * 返回 { original, type } 数组
 */
export function extractMarkdownImages(markdown: string): Array<{
  original: string;
  type: "relative" | "remote" | "data-uri";
}> {
  const results: Array<{
    original: string;
    type: "relative" | "remote" | "data-uri";
  }> = [];

  // Match ![alt](src) patterns
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const src = match[2];
    if (src.startsWith("data:")) {
      results.push({ original: src, type: "data-uri" });
    } else if (src.startsWith("http://") || src.startsWith("https://")) {
      results.push({ original: src, type: "remote" });
    } else {
      results.push({ original: src, type: "relative" });
    }
  }

  return results;
}

/**
 * 替换 Markdown 中的图片路径
 */
export function rewriteMarkdownImagePaths(
  markdown: string,
  rewriteMap: Map<string, string>,
): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (fullMatch, alt, src) => {
      const newSrc = rewriteMap.get(src);
      if (newSrc) {
        return `![${alt}](${newSrc})`;
      }
      return fullMatch;
    },
  );
}
