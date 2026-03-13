import type { SiteConfig } from "@/features/config/site-config";

export const blogConfig = {
  title: "站点名称",
  author: "作者",
  description:
    "这是我的个人网站和博客。在这里，我主要分享与技术和生活相关的内容。欢迎阅读！",
  social: {
    github: "https://github.com/example",
    email: "example@email.com",
  },
  theme: {
    default: {
      navBarName: "导航栏名称",
    },
    fuwari: {
      homeBg: "/images/home-bg.webp",
      avatar: "/images/avatar.png",
    },
  },
} as const satisfies SiteConfig;
