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
  background: {
    homeImage: "", // R2 path or external URL (hero on homepage)
    globalImage: "", // R2 path or external URL (all other pages + scroll target)
    light: { opacity: 0.15 }, // opacity in light mode
    dark: { opacity: 0.1 }, // opacity in dark mode
    backdropBlur: 8, // px, Gaussian blur
    transitionDuration: 600, // ms, route crossfade (0-3000)
  },
};

export type BlogConfig = typeof blogConfig;
