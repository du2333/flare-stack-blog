import type { JSONContent } from "@tiptap/react";
import { extractImageKey } from "@/features/media/media.utils";
import { highlight } from "@/lib/shiki";

export function slugify(text: string | null | undefined) {
  if (!text) return "untitled-log";

  const cleaned = text
    .toString()
    .toLowerCase()
    .trim()
    // 1. 把所有空格 (space) 和下划线 (_) 替换为横杠 (-)
    .replace(/[\s_]+/g, "-")

    // 2. 核心正则：移除所有 "非" 允许字符
    // ^      : 取反
    // a-z0-9 : 英文和数字
    // \-     : 横杠
    // \u4e00-\u9fa5 : 汉字的标准 Unicode 范围 (基本覆盖所有常用字)
    .replace(/[^a-z0-9\-\u4E00-\u9FA5]+/g, "")

    // 3. 处理连续的横杠 (比如 "Hello... World" 会变成 "hello---world"，这里修正为 "hello-world")
    .replace(/-{2,}/g, "-")

    // 4. 去除开头和结尾的横杠
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return cleaned || "untitled-log";
}

export function extractAllImageKeys(doc: JSONContent | null): Array<string> {
  const keys: Array<string> = [];

  function traverse(node: JSONContent) {
    if (node.type === "image" && node.attrs?.src) {
      const key = extractImageKey(node.attrs.src);
      if (key) keys.push(key);
    }
    if (node.content) node.content.forEach(traverse);
  }

  if (doc) traverse(doc);
  return Array.from(new Set(keys)); // 去重
}

export async function highlightCodeBlocks(
  doc: JSONContent,
): Promise<JSONContent> {
  const cloned = structuredClone(doc);

  async function traverse(node: JSONContent) {
    if (node.type === "codeBlock") {
      const code = node.content?.map((n) => n.text || "").join("") || "";
      const lang = node.attrs?.language || "text";
      try {
        const html = await highlight(code.trim(), lang);
        node.attrs = { ...node.attrs, highlightedHtml: html };
      } catch (e) {
        console.warn(
          JSON.stringify({
            event: "code_highlight_failed",
            lang,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    }
    if (node.content) {
      await Promise.all(node.content.map(traverse));
    }
  }

  await traverse(cloned);
  return cloned;
}

export function convertToPlainText(doc: JSONContent | null): string {
  if (!doc) return "";
  const textParts: Array<string> = [];

  function traverse(node: JSONContent) {
    // 1. 处理普通文本 (包含 Bold, Italic, Link, Code, Strike 等所有 Inline 样式)
    if (node.type === "text" && node.text) {
      textParts.push(node.text);
    }
    // 2. 处理图片 (提取 Alt 文本，这很重要！)
    else if (node.type === "image" && node.attrs?.alt) {
      // 给图片文本加个空格，防止和前后文粘连
      textParts.push(` ${node.attrs.alt} `);
    }

    // 3. 递归遍历子节点 (处理 Heading, Blockquote, List 等容器)
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }

    // 4. 处理块级元素换行 (关键步骤)
    // 你的 Extension 里包含这些块级元素，结束时都应该加换行
    const isBlock = [
      "paragraph",
      "heading", // h1-h4
      "codeBlock", // 代码块结束要换行
      "blockquote", // 引用块
      "listItem", // 列表项 (li)
      "bulletList", // ul
      "orderedList", // ol
    ].includes(node.type || "");

    if (isBlock) {
      textParts.push("\n");
    }
  }

  traverse(doc);

  // 5. 清理多余空行，整洁输出
  // 将连续的换行符替换为单个空格或单个换行
  return textParts.join("").replace(/\n+/g, "\n").trim();
}
