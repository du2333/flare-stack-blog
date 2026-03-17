import type { PostWithToc } from "@/features/posts/schema/posts.schema";

export interface PostPageProps {
  post: Exclude<PostWithToc, null>;
}
