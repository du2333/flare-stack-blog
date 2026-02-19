import type { PostWithToc } from "@/features/posts/posts.schema";

export interface PostPageProps {
  post: Exclude<PostWithToc, null>;
}
