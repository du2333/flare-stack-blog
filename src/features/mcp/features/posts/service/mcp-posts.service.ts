import type { JSONContent } from "@tiptap/react";
import { jsonContentToMarkdown } from "@/features/import-export/utils/markdown-serializer";

type DateLike = Date | string | null | undefined;

function toIsoString(value: DateLike) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? null;
}

function serializeTag(tag: {
  createdAt: Date | string;
  id: number;
  name: string;
}) {
  return {
    createdAt: toIsoString(tag.createdAt)!,
    id: tag.id,
    name: tag.name,
  };
}

export function serializeMcpPostListItem(post: {
  createdAt: Date | string;
  id: number;
  publishedAt: Date | string | null;
  readTimeInMinutes: number;
  slug: string;
  status: "draft" | "published";
  summary: string | null;
  tags?: Array<{
    createdAt: Date | string;
    id: number;
    name: string;
  }>;
  title: string;
  updatedAt: Date | string;
}) {
  return {
    createdAt: toIsoString(post.createdAt)!,
    id: post.id,
    publishedAt: toIsoString(post.publishedAt),
    readTimeInMinutes: post.readTimeInMinutes,
    slug: post.slug,
    status: post.status,
    summary: post.summary,
    tags: post.tags?.map(serializeTag),
    title: post.title,
    updatedAt: toIsoString(post.updatedAt)!,
  };
}

export function serializeMcpPostDetail(post: {
  contentJson: unknown;
  createdAt: Date | string;
  hasPublicCache: boolean;
  id: number;
  isSynced: boolean;
  publishedAt: Date | string | null;
  readTimeInMinutes: number;
  slug: string;
  status: "draft" | "published";
  summary: string | null;
  tags?: Array<{
    createdAt: Date | string;
    id: number;
    name: string;
  }>;
  title: string;
  updatedAt: Date | string;
}) {
  return {
    ...serializeMcpPostListItem(post),
    contentMarkdown: post.contentJson
      ? jsonContentToMarkdown(post.contentJson as JSONContent)
      : "",
    hasPublicCache: post.hasPublicCache,
    isSynced: post.isSynced,
  };
}
