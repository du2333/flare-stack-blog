/**
 * One state of a Post, as the diff compares it: the draft, a Post Revision
 * or the published version. Nothing here names where it came from.
 */
export interface PostDiffSide {
  title: string;
  summary: string | null;
  slug: string;
  /** An ISO string or a Date; null for none. */
  publishedAt: string | Date | null;
  categoryId: number | null;
  tagIds: ReadonlyArray<number>;
  coverMediaId: number | null;
  /**
   * The cover's address, for the thumbnail; null for no cover or one whose
   * Media is gone. Covers are compared by `coverMediaId`.
   */
  coverUrl: string | null;
  /** The body as Markdown (`contentFormat=markdown`); null for an empty body. */
  markdown: string | null;
}
