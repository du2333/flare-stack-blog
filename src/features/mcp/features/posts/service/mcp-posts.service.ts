import type { JSONContent } from "@tiptap/react";
import { markdownToJsonContent } from "@/features/import-export/utils/markdown-parser";
import { jsonContentToMarkdown } from "@/features/import-export/utils/markdown-serializer";
import type { UpdatePostInput } from "@/features/posts/schema/posts.schema";
import { serializeMcpDate } from "../../../service/mcp-serialize";

function serializeTag(tag: {
  createdAt: Date | string;
  id: number;
  name: string;
}) {
  return {
    createdAt: serializeMcpDate(tag.createdAt),
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
    createdAt: serializeMcpDate(post.createdAt),
    id: post.id,
    publishedAt: serializeMcpDate(post.publishedAt),
    readTimeInMinutes: post.readTimeInMinutes,
    slug: post.slug,
    status: post.status,
    summary: post.summary,
    tags: post.tags?.map(serializeTag),
    title: post.title,
    updatedAt: serializeMcpDate(post.updatedAt),
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

type McpPostUpdateInput = {
  id: number;
  title?: string;
  summary?: string | null;
  slug?: string;
  status?: "draft" | "published";
  publishedAt?: string | null;
  readTimeInMinutes?: number;
  contentMarkdown?: string;
};

function normalizeMcpMarkdownInput(markdown: string) {
  const hasRealLineBreak = /[\r\n]/.test(markdown);
  const hasEscapedLineBreak = /\\r\\n|\\n|\\r/.test(markdown);

  if (!hasEscapedLineBreak) {
    return markdown;
  }

  // Some MCP clients send JSON-escaped markdown ("\n") as literal text.
  // When that happens, marked sees one long line and can parse the whole
  // document as a single heading or paragraph.
  if (hasRealLineBreak) {
    return markdown;
  }

  return markdown
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export async function toPostUpdateInput(
  input: McpPostUpdateInput,
): Promise<UpdatePostInput> {
  const data: UpdatePostInput["data"] = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.summary !== undefined) {
    data.summary = input.summary;
  }

  if (input.slug !== undefined) {
    data.slug = input.slug;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.publishedAt !== undefined) {
    data.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  }

  if (input.readTimeInMinutes !== undefined) {
    data.readTimeInMinutes = input.readTimeInMinutes;
  }

  if (input.contentMarkdown !== undefined) {
    data.contentJson = await markdownToJsonContent(
      normalizeMcpMarkdownInput(input.contentMarkdown),
    );
  }

  return {
    id: input.id,
    data,
  };
}
