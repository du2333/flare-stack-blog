import type { orpcClient } from "@/lib/orpc";
import type { PostDiffSide } from "./post-diff.types";

/** The admin read of one Post, with its body as Markdown. */
export type AdminPostRead = NonNullable<
  Awaited<ReturnType<typeof orpcClient.posts.admin.get>>
>;

/**
 * The draft of a Post as a diff side, from a read with
 * `contentFormat=markdown`. `tags` are the draft's.
 */
export function draftSide(
  post: AdminPostRead,
  tags: ReadonlyArray<{ id: number }>,
): PostDiffSide {
  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    publishedAt: post.publishedAt,
    categoryId: post.categoryId,
    tagIds: tags.map((tag) => tag.id),
    coverMediaId: post.coverMediaId,
    coverUrl: post.cover?.url ?? null,
    markdown: post.contentMarkdown ?? null,
  };
}

/**
 * The published version of a Post as a diff side, from the same read as the
 * draft's: its `published` fields and `publicSnapshotContentMarkdown`. Null
 * while the Post is not published.
 */
export function publishedSide(post: AdminPostRead): PostDiffSide | null {
  const { published } = post;
  if (!published) return null;
  return {
    title: published.title,
    summary: published.summary,
    slug: published.slug,
    publishedAt: published.publishedAt,
    categoryId: published.categoryId,
    tagIds: published.tagIds,
    coverMediaId: published.cover?.id ?? null,
    coverUrl: published.cover?.url ?? null,
    markdown: post.publicSnapshotContentMarkdown ?? null,
  };
}
