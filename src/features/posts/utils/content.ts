import type { JSONContent } from "@tiptap/react";
import { extractImageKey } from "@/features/media/utils/media.utils";
import {
  directVideoOf,
  videoMetaOf,
  videoPageUrl,
  videoSourceOf,
} from "@/features/posts/utils/video-source";

/**
 * What a slug made from a title falls back to when no character of the title
 * can be kept, such as a title of emoji alone. It is not unique by itself: the
 * slug generator numbers it (`untitled-log-1`) when another post has it.
 */
export const FALLBACK_SLUG = "untitled-log";

/**
 * A slug made from `text`: lower case Latin letters and digits, Chinese
 * characters and single dashes. Compatibility forms are folded first (NFKC:
 * fullwidth letters, ligatures such as ﬁ) and ß becomes ss, so those keep
 * their letters; accents are dropped (café becomes cafe). Any other
 * character is dropped, and a title with none left gets `FALLBACK_SLUG`.
 */
export function slugify(text: string | null | undefined) {
  if (!text) return FALLBACK_SLUG;

  const cleaned = text
    .toString()
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
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

  return cleaned || FALLBACK_SLUG;
}

export function jsonContentHasType(
  doc: JSONContent | null | undefined,
  types: string | ReadonlyArray<string>,
): boolean {
  if (!doc) return false;
  const wanted = typeof types === "string" ? new Set([types]) : new Set(types);

  function walk(node: JSONContent): boolean {
    if (node.type && wanted.has(node.type)) return true;
    if (!node.content) return false;
    for (const child of node.content) {
      if (walk(child)) return true;
    }
    return false;
  }

  return walk(doc);
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

/**
 * The Media key `src` names by its path, `/images/{key}`, alone or on the
 * site's own address (`siteHost`, the bare host such as `blog.example.com`,
 * over http or https). An address on any other host is an external image
 * even when its path looks the same.
 */
export function mediaPathKey(src: string, siteHost: string) {
  if (src.startsWith("/images/")) return extractImageKey(src);
  if (!/^https?:\/\//i.test(src)) return undefined;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }
  return url.host === siteHost.toLowerCase()
    ? extractImageKey(url.pathname)
    : undefined;
}

/**
 * The images the body shows from the media library by its path (see
 * `mediaPathKey`), with the Media key each names. These must exist.
 */
export function extractMediaPathImages(
  doc: JSONContent | null | undefined,
  siteHost: string,
): Array<{ src: string; key: string }> {
  const images: Array<{ src: string; key: string }> = [];

  function traverse(node: JSONContent) {
    const src = node.type === "image" ? node.attrs?.src : undefined;
    if (typeof src === "string") {
      const key = mediaPathKey(src, siteHost);
      if (key) images.push({ src, key });
    }
    node.content?.forEach(traverse);
  }

  if (doc) traverse(doc);
  return images;
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
    // 视频没有文字，输出原视频链接，RSS 阅读器里也能找到
    else if (node.type === "video") {
      const source = videoSourceOf(node.attrs);
      const { title } = videoMetaOf(node.attrs);
      // 视频直链没有来源网页时，输出视频文件地址
      const direct = source ? null : directVideoOf(node.attrs);
      const address = source
        ? videoPageUrl(source)
        : direct && (direct.pageUrl ?? direct.src);
      if (address) {
        textParts.push(`\n${title ? `${title} ` : ""}${address}\n`);
      }
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

/** ~400 CJK chars/min, ~200 English words/min. Minimum 1. */
export function estimateReadTimeMinutes(doc: JSONContent | null): number {
  const text = convertToPlainText(doc);
  const cjkChars = (
    text.match(
      /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g,
    ) || []
  ).length;
  const textWithoutCjk = text.replace(
    /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g,
    " ",
  );
  const englishWords = textWithoutCjk.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjkChars / 400 + englishWords / 200));
}
