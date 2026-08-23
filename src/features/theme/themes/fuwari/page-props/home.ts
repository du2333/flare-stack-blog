import type { PostItem } from "@/features/posts/schema/posts.schema";

export interface HomePageProps {
  posts: Array<PostItem>;
  pinnedPosts?: Array<PostItem>;
  popularPosts?: Array<PostItem>;
}
