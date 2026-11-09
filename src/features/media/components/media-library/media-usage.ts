import { m } from "@/paraglide/messages";
import type { MediaAsset } from "./types";

/**
 * What uses an image, in a few words: "3 篇 · 2 条动态". The posts that use it
 * in the draft or the published version and the Moments that show it come
 * first, then the posts whose Post Revisions alone use it ("另 1 篇历史").
 */
export function usageCount(asset: MediaAsset) {
  const parts: Array<string> = [];
  if (asset.postCount > 0) {
    parts.push(m.media_post_count({ count: asset.postCount }));
  }
  if (asset.momentCount > 0) {
    parts.push(m.media_moment_count({ count: asset.momentCount }));
  }
  if (asset.revisionOnlyPostCount > 0) {
    parts.push(
      m.media_revisions_count_also({ count: asset.revisionOnlyPostCount }),
    );
  }
  return parts.join(" · ");
}

/** The refusal to delete an image that is referenced, worded for the Admin. */
export class MediaInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaInUseError";
  }
}

/** Names what refuses the delete; a reference no list shows (an Admin's avatar) gets the plain wording. */
export function mediaInUseMessage(counts: { posts: number; moments: number }) {
  if (counts.posts > 0 && counts.moments > 0) {
    return m.media_in_use_posts_moments(counts);
  }
  if (counts.posts > 0) return m.media_in_use_posts({ posts: counts.posts });
  if (counts.moments > 0) {
    return m.media_in_use_moments({ moments: counts.moments });
  }
  return m.media_in_use();
}
