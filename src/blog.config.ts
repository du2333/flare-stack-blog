import { clientEnv } from "@/lib/env/client.env";

const env = clientEnv();

export const blogConfig = {
  title: env.VITE_BLOG_TITLE || "Flare Stack Blog",
  name: env.VITE_BLOG_NAME || "blog",
  author: env.VITE_BLOG_AUTHOR || "作者",
  description:
    env.VITE_BLOG_DESCRIPTION || "这是博客的描述，写一段话介绍一下这个博客，",
  social: {
    github: env.VITE_BLOG_GITHUB || "https://github.com/example",
    email: env.VITE_BLOG_EMAIL || "demo@example.com",
  },

  // 背景图片配置（调试时，图片可以放在 /public/images/ 目录下）
  background: {
    imageUrl: env.VITE_BLOG_BACKGROUND_IMAGE_URL || "/images/background.webp", // 全局背景
    homeImageUrl:
      env.VITE_BLOG_BACKGROUND_HOME_IMAGE_URL || "/images/home-bg.webp", // 主页背景
    opacity: env.VITE_BLOG_BACKGROUND_OPACITY ?? 20,
    darkOpacity: env.VITE_BLOG_BACKGROUND_DARK_OPACITY ?? 10,
    blur: env.VITE_BLOG_BACKGROUND_BLUR ?? 1,
    overlayOpacity: env.VITE_BLOG_BACKGROUND_OVERLAY_OPACITY ?? 80,
    transitionDuration: env.VITE_BLOG_BACKGROUND_TRANSITION_DURATION ?? 1000,
  },
};

export type BlogConfig = typeof blogConfig;
