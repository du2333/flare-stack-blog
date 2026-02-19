import type { PostItem } from "@/features/posts/posts.schema";
import type { TagWithCount } from "@/features/tags/tags.schema";

export interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}
