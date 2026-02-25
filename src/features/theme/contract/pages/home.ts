import type { PostItem } from "@/features/posts/posts.schema";

export interface HomePageProps {
  posts: Array<PostItem>;
  /** Total number of published posts (for stats display) */
  totalPosts: number;
  /** Total number of tags (for stats display) */
  totalTags: number;
}
