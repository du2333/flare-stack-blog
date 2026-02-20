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
  theme: {
    fuwari: {
      homeBg: env.VITE_FUWARI_HOME_BG || "/images/home-bg.jpg",
      avatar: env.VITE_FUWARI_AVATAR || "/images/avatar.png",
    },
  },
};

export type BlogConfig = typeof blogConfig;
