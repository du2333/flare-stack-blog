import type { PostItem } from "@/features/posts/schema/posts.schema";

export interface PopularPostItem {
  slug: string;
  title: string;
  views: number;
}

export interface HomePageProps {
  posts: Array<PostItem>;
  pinnedPosts?: Array<PostItem>;
  popularPosts?: Array<PopularPostItem>;
}
