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
    default: {
      background: {
        homeImage: env.VITE_DEFAULT_HOME_IMAGE || "", // R2 path or external URL (hero on homepage)
        globalImage: env.VITE_DEFAULT_GLOBAL_IMAGE || "", // R2 path or external URL (all other pages + scroll target)
        light: { opacity: env.VITE_DEFAULT_LIGHT_OPACITY ?? 0.15 }, // opacity in light mode
        dark: { opacity: env.VITE_DEFAULT_DARK_OPACITY ?? 0.1 }, // opacity in dark mode
        backdropBlur: env.VITE_DEFAULT_BACKDROP_BLUR ?? 8, // px, Gaussian blur
        transitionDuration: env.VITE_DEFAULT_TRANSITION_DURATION ?? 600, // ms, route crossfade (0-3000)
      },
    },
    fuwari: {
      homeBg: env.VITE_FUWARI_HOME_BG || "/images/home-bg.webp",
      avatar: env.VITE_FUWARI_AVATAR || "/images/avatar.png",
    },
    cuckoo: {
      coverImage: env.VITE_CUCKOO_COVER_IMAGE || "/images/home-bg.webp",
      avatar: env.VITE_CUCKOO_AVATAR || "/images/avatar.png",
      primaryColor: env.VITE_CUCKOO_PRIMARY_COLOR || "#39C5BB",
      background: {
        enabled: env.VITE_CUCKOO_BACKGROUND_ENABLED ?? true, // 是否启用背景图片
        apiUrl: env.VITE_CUCKOO_BACKGROUND_API || "https://www.dmoe.cc/random.php", // 背景图片 API
        light: { opacity: env.VITE_CUCKOO_BG_LIGHT_OPACITY ?? 0.8 }, // 浅色模式透明度
        dark: { opacity: env.VITE_CUCKOO_BG_DARK_OPACITY ?? 0.75 }, // 深色模式透明度
        transitionDuration: env.VITE_CUCKOO_BG_TRANSITION ?? 600, // ms
      },
    },
  },
};

export type BlogConfig = typeof blogConfig;
