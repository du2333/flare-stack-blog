import type { ThemeConfig } from "@/features/theme/contract/config";

export const config: ThemeConfig = {
  home: {
    recentPostsLimit: 6,
    popularPostsLimit: 4,
  },
  posts: {
    postsPerPage: 10,
  },
  post: {
    relatedPostsLimit: 3,
  },
};
