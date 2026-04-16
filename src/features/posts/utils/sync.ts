import type { JSONContent } from "@tiptap/react";

export async function calculatePostHash(post: {
  title: string;
  contentJson: JSONContent | null;
  summary: string | null;
  tagIds: Array<number>;
  slug: string;
  publishedAt: Date | string | null;
  pinnedAt?: Date | string | null;
  readTimeInMinutes: number;
}): Promise<string> {
  const toISOOrNull = (d: Date | string | null) =>
    d instanceof Date ? d.toISOString() : d;

  const stateToHash = {
    title: post.title,
    contentJson: post.contentJson,
    summary: post.summary,
    tagIds: [...post.tagIds].sort(),
    slug: post.slug,
    publishedAt: toISOOrNull(post.publishedAt),
    pinnedAt: toISOOrNull(post.pinnedAt ?? null),
    readTimeInMinutes: post.readTimeInMinutes,
  };

  const msgUint8 = new TextEncoder().encode(JSON.stringify(stateToHash));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
