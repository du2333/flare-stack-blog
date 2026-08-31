import {
  normalizePostCategoryName,
  normalizePostTagName,
} from "@/features/posts/schema/posts.schema";

export type PostsPublicSearch = {
  tagName?: string;
  categoryName?: string;
  uncategorized?: boolean;
};

export function withTagFilter(tagName: string | undefined): PostsPublicSearch {
  const name = normalizePostTagName(tagName);
  return name ? { tagName: name } : {};
}

export function withCategoryFilter(
  categoryName: string | undefined,
): PostsPublicSearch {
  const name = normalizePostCategoryName(categoryName);
  return name ? { categoryName: name } : {};
}

export function withUncategorizedFilter(): PostsPublicSearch {
  return { uncategorized: true };
}
