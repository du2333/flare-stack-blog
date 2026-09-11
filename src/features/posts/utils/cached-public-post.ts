import type { QueryClient } from "@tanstack/react-query";
import type { PostItem } from "@/features/posts/schema/posts.schema";

function isPostItem(value: unknown): value is PostItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "slug" in value &&
    "title" in value &&
    typeof (value as { slug: unknown }).slug === "string" &&
    typeof (value as { title: unknown }).title === "string"
  );
}

function collectPostItems(data: unknown): Array<PostItem> {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(isPostItem);
  if (typeof data !== "object") return [];

  if ("items" in data && Array.isArray(data.items)) {
    return data.items.filter(isPostItem);
  }
  if ("pages" in data && Array.isArray(data.pages)) {
    return data.pages.flatMap((page) => collectPostItems(page));
  }
  return [];
}

export function findCachedPublicPost(
  queryClient: QueryClient,
  slug: string,
): PostItem | undefined {
  for (const query of queryClient.getQueryCache().getAll()) {
    const found = collectPostItems(query.state.data).find(
      (post) => post.slug === slug,
    );
    if (found) return found;
  }
  return undefined;
}
