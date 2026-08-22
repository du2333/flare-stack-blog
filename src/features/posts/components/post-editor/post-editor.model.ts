import type { JSONContent } from "@tiptap/react";

const CJK_CHAR =
  /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;

export const BLOB_UPLOADING_ERROR = "BLOB_UPLOADING";

export function persistableTagIds(tagIds: Array<number>) {
  return tagIds.filter((id) => id > 0);
}

export function contentHasBlobUrl(
  doc: JSONContent | null | undefined,
): boolean {
  if (!doc) return false;
  if (
    doc.type === "image" &&
    typeof doc.attrs?.src === "string" &&
    doc.attrs.src.startsWith("blob:")
  ) {
    return true;
  }
  return doc.content?.some((node) => contentHasBlobUrl(node)) ?? false;
}

export function contentStatsFromText(text: string) {
  const chars = text.replace(/\n/g, "").length;
  const cjkChars = (text.match(CJK_CHAR) || []).length;
  const textWithoutCjk = text.replace(CJK_CHAR, " ");
  const englishWords = textWithoutCjk.split(/\s+/).filter(Boolean).length;
  return { chars, words: cjkChars + englishWords };
}

export function shouldAutogenerateSlug(
  slug: string,
  lastAutoSlug: string | null,
) {
  const trimmed = slug.trim();
  return trimmed.length === 0 || lastAutoSlug === trimmed;
}
