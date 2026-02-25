import type { ThemeConfig } from "@/features/theme/contract/config";
import { blogConfig } from "@/blog.config";

export const config: ThemeConfig = {
  home: {
    featuredPostsLimit: 5,
  },
  posts: {
    postsPerPage: 24,
  },
  post: {
    relatedPostsLimit: 4,
  },
  preloadImages: [blogConfig.theme.fuwari.homeBg],
};
