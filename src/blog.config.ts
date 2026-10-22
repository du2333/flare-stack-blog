import type { SiteConfig } from "@/features/config/site-config.schema";

export const blogConfig = {
  title: "站点名称",
  author: "作者",
  description:
    "这是我的个人网站和博客。在这里，我主要分享与技术和生活相关的内容。欢迎阅读！",
  social: [
    { platform: "github", url: "https://github.com/example" },
    { platform: "email", url: "mailto:example@email.com" },
    { platform: "rss", url: "/rss.xml" },
  ],
  icons: {
    faviconSvg: "/favicon.svg",
    faviconIco: "/favicon.ico",
    favicon96: "/favicon-96x96.png",
    appleTouchIcon: "/apple-touch-icon.png",
    webApp192: "/web-app-manifest-192x192.png",
    webApp512: "/web-app-manifest-512x512.png",
  },
  theme: {
    default: {
      navBarName: "导航栏名称",
    },
    fuwari: {
      homeBg: "/images/home-bg.webp",
      avatar: "/images/avatar.png",
      primaryHue: 250,
    },
  },
  /**
   * 板块功能开关（简化版 feature flag）
   *
   * 用途：新板块上线出问题时，关掉即可隐藏导航项并让路由返回 404，
   *      不需要回滚代码，也不影响主站其他板块。
   *
   * 约定：
   *   - false 时：导航不显示该项 + 对应路由返回 404
   *   - 切换后需要重新部署（构建期读取，非运行时）
   */
  features: {
    moments: false, // 动态 / 杂谈 / 照片
    library: false, // 音乐 / 项目 / 时光轴 / 技能树
    about: false, // 关于页
  },
} as const satisfies SiteConfig;
