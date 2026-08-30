import { z } from "zod";
import { defineEntry } from "@/features/cache/public-cache";
import * as PostRepo from "@/features/posts/data/posts.data";
import {
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
} from "@/features/posts/schema/posts.schema";
import { toPublicCover } from "@/features/posts/public-snapshot";
import { estimateReadTimeMinutes } from "@/features/posts/utils/content";
import { generateTableOfContents } from "@/features/posts/utils/toc";

const POST_PUBLIC_REASONS = [
  "post.published",
  "post.deleted",
  "tag.changed",
] as const;

export const pinnedPosts = defineEntry({
  name: "posts.pinned",
  namespace: "posts:pinned",
  key: (_params: Record<string, never>) => ["posts", "pinned"],
  schema: PostItemSchema.array(),
  ttl: "7d",
  invalidatedBy: POST_PUBLIC_REASONS,
  load: (context) => PostRepo.findPinnedPosts(context.db),
});

export const popularPosts = defineEntry({
  name: "posts.popular",
  namespace: "posts:popular",
  key: ({
    limit,
    snapshotVersion,
  }: {
    limit: number;
    snapshotVersion: number;
    postIds: number[];
  }) => ["posts", "popular", snapshotVersion, limit],
  schema: PostItemSchema.array(),
  ttl: "7d",
  invalidatedBy: [...POST_PUBLIC_REASONS, "post-popularity.updated"],
  load: async (context, { limit, postIds }) => {
    const posts = await PostRepo.findPostsByIds(context.db, postIds);
    const postById = new Map(posts.map((post) => [post.id, post]));
    return postIds
      .flatMap((postId) => {
        const post = postById.get(postId);
        return post ? [post] : [];
      })
      .slice(0, limit);
  },
});

export const postsList = defineEntry({
  name: "posts.list",
  namespace: "posts:list",
  address: ["limit", "cursor"],
  key: ({
    limit,
    cursor,
    tagName,
  }: {
    limit: number;
    cursor: number;
    tagName?: string;
    excludePinned?: boolean;
  }) =>
    tagName === undefined
      ? ["posts", "list", limit, cursor, "all"]
      : ["posts", "list", limit, cursor, "tag", tagName],
  schema: PostListResponseSchema,
  ttl: "7d",
  invalidatedBy: POST_PUBLIC_REASONS,
  load: (context, { limit, cursor, tagName, excludePinned }) =>
    PostRepo.getPostsCursor(context.db, {
      cursor,
      limit,
      publicOnly: true,
      tagName,
      excludePinned,
    }),
});

export const postBySlug = defineEntry({
  name: "posts.detail",
  namespace: "posts:detail",
  address: ["slug"],
  key: ({ slug }: { slug: string }) => ["post", slug],
  schema: PostWithTocSchema,
  ttl: "7d",
  invalidatedBy: POST_PUBLIC_REASONS,
  load: async (context, { slug }) => {
    const post = await PostRepo.findPostBySlug(context.db, slug, {
      publicOnly: true,
    });
    if (!post) return null;

    return {
      id: post.id,
      title: post.title,
      summary: post.summary,
      slug: post.slug,
      status: "published" as const,
      publishedAt: post.publishedAt,
      pinnedAt: post.pinnedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      contentJson: post.contentJson,
      readTimeInMinutes: estimateReadTimeMinutes(post.contentJson),
      tags: post.tags,
      toc: generateTableOfContents(post.contentJson),
      cover: toPublicCover(post.publicSnapshotJson?.cover),
    };
  },
});

export const relatedPostIds = defineEntry({
  name: "posts.related",
  namespace: "posts:related",
  key: ({ slug, limit }: { slug: string; limit?: number }) => [
    "posts",
    "related-ids",
    slug,
    limit,
  ],
  schema: z.array(z.number()),
  ttl: "7d",
  invalidatedBy: POST_PUBLIC_REASONS,
  load: (context, { slug, limit }) =>
    PostRepo.getRelatedPostIds(context.db, slug, { limit }),
});
