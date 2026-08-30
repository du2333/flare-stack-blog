import {
  normalizePostCategoryName,
  normalizePostTagName,
} from "@/features/posts/schema/posts.schema";

export type PostsPublicSearch = {
  tagName?: string;
  categoryName?: string;
  uncategorized?: boolean;
};

function compactSearch(search: PostsPublicSearch): PostsPublicSearch {
  const tagName = normalizePostTagName(search.tagName);
  const uncategorized = search.uncategorized === true;
  const categoryName = uncategorized
    ? undefined
    : normalizePostCategoryName(search.categoryName);
  return {
    ...(tagName ? { tagName } : {}),
    ...(categoryName ? { categoryName } : {}),
    ...(uncategorized ? { uncategorized: true } : {}),
  };
}

function fromUnknown(prev: Record<string, unknown>): PostsPublicSearch {
  return compactSearch({
    tagName: typeof prev.tagName === "string" ? prev.tagName : undefined,
    categoryName:
      typeof prev.categoryName === "string" ? prev.categoryName : undefined,
    uncategorized: prev.uncategorized === true || prev.uncategorized === "true",
  });
}

export function withTagFilter(
  prev: Record<string, unknown>,
  tagName: string | undefined,
): PostsPublicSearch {
  const current = fromUnknown(prev);
  const nextTag = normalizePostTagName(tagName);
  return compactSearch({
    ...current,
    tagName: nextTag === current.tagName ? undefined : nextTag,
  });
}

export function withCategoryFilter(
  prev: Record<string, unknown>,
  categoryName: string | undefined,
): PostsPublicSearch {
  const current = fromUnknown(prev);
  const nextName = normalizePostCategoryName(categoryName);
  return compactSearch({
    ...current,
    categoryName: nextName === current.categoryName ? undefined : nextName,
    uncategorized: false,
  });
}

export function withUncategorizedFilter(
  prev: Record<string, unknown>,
): PostsPublicSearch {
  const current = fromUnknown(prev);
  return compactSearch({
    ...current,
    categoryName: undefined,
    uncategorized: !current.uncategorized,
  });
}
