import matter from "gray-matter";
import type { PostFrontmatter } from "@/features/import-export/import-export.schema";

/**
 * 生成 YAML frontmatter + Markdown 内容
 */
export function stringifyFrontmatter(
  frontmatter: PostFrontmatter,
  markdownContent: string,
): string {
  return matter.stringify(markdownContent, frontmatter);
}

/**
 * 解析 Markdown 文件的 frontmatter 和正文内容
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const { data, content } = matter(raw);
  return { data, content };
}

/**
 * 将各种博客平台的 frontmatter 字段映射到统一格式
 * 兼容 Hugo / Hexo / Jekyll 等常见字段名
 */
export function normalizeFrontmatter(
  data: Record<string, unknown>,
): Partial<PostFrontmatter> {
  const result: Partial<PostFrontmatter> = {};

  // title
  if (typeof data.title === "string") {
    result.title = data.title;
  }

  // slug — 多种来源
  const slugSource = data.slug ?? data.url ?? data.permalink;
  if (typeof slugSource === "string") {
    // 从路径中提取最后一段，如 /posts/my-post/ → my-post
    const segments = slugSource.split("/").filter(Boolean);
    result.slug = segments[segments.length - 1] ?? slugSource;
  }

  // summary — 多种字段名
  const summarySource = data.summary ?? data.description ?? data.excerpt;
  if (typeof summarySource === "string") {
    result.summary = summarySource;
  }

  // status
  if (data.draft === true) {
    result.status = "draft";
  } else if (typeof data.status === "string") {
    result.status = data.status;
  } else {
    result.status = "published";
  }

  // publishedAt — 多种字段名
  const dateSource = data.publishedAt ?? data.date ?? data.published_at;
  if (dateSource) {
    result.publishedAt = toISOString(dateSource);
  }

  // createdAt
  const createdSource = data.createdAt ?? data.created_at ?? data.date;
  if (createdSource) {
    result.createdAt = toISOString(createdSource);
  }

  // updatedAt
  const updatedSource =
    data.updatedAt ?? data.updated_at ?? data.lastmod ?? data.modified;
  if (updatedSource) {
    result.updatedAt = toISOString(updatedSource);
  }

  // readTimeInMinutes
  if (typeof data.readTimeInMinutes === "number") {
    result.readTimeInMinutes = data.readTimeInMinutes;
  }

  // tags — 可能是 tags 或 categories
  const tagsSource = data.tags ?? data.categories;
  if (Array.isArray(tagsSource)) {
    result.tags = tagsSource.filter((t): t is string => typeof t === "string");
  }

  return result;
}

function toISOString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return undefined;
}
