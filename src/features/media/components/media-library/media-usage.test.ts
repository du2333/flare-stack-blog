import { expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { mediaInUseMessage, usageCount } from "./media-usage";
import type { MediaAsset } from "./types";

function counts(
  postCount: number,
  momentCount: number,
  revisionOnlyPostCount = 0,
) {
  return { postCount, momentCount, revisionOnlyPostCount } as MediaAsset;
}

const posts = (count: number) => m.media_post_count({ count });
const moments = (count: number) => m.media_moment_count({ count });
const revisions = (count: number) => m.media_revisions_count_also({ count });

it("counts the posts and the Moments that use an image", () => {
  expect(usageCount(counts(3, 0))).toBe(posts(3));
  expect(usageCount(counts(0, 2))).toBe(moments(2));
  expect(usageCount(counts(3, 2))).toBe(`${posts(3)} · ${moments(2)}`);
});

it("appends the posts that only Post Revisions use", () => {
  expect(usageCount(counts(3, 0, 1))).toBe(`${posts(3)} · ${revisions(1)}`);
  expect(usageCount(counts(0, 2, 1))).toBe(`${moments(2)} · ${revisions(1)}`);
  expect(usageCount(counts(3, 2, 1))).toBe(
    `${posts(3)} · ${moments(2)} · ${revisions(1)}`,
  );
});

it("names what refuses a delete", () => {
  expect(mediaInUseMessage({ posts: 2, moments: 0 })).toBe(
    m.media_in_use_posts({ posts: 2 }),
  );
  expect(mediaInUseMessage({ posts: 0, moments: 1 })).toBe(
    m.media_in_use_moments({ moments: 1 }),
  );
  expect(mediaInUseMessage({ posts: 2, moments: 1 })).toBe(
    m.media_in_use_posts_moments({ posts: 2, moments: 1 }),
  );
  expect(mediaInUseMessage({ posts: 0, moments: 0 })).toBe(m.media_in_use());
});
