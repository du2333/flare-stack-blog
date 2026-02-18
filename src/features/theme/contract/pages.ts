import type { PostItem } from "@/features/posts/posts.schema";
import type { TagWithCount } from "@/features/tags/tags.schema";

/**
 * 主题契约 — 页面 Props 接口
 *
 * 业务层（features/）通过这些接口向主题传递数据。
 * 主题可以选择使用或忽略其中的字段。
 */

export interface HomePageProps {
  posts: Array<PostItem>;
}

export interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}
