// 主题注册表 — 列出所有可用主题及其路由级配置
// 添加新主题时，需要在此文件中同步更新
export const themeNames = ["default", "fuwari", "cuckoo"] as const;
export type ThemeName = (typeof themeNames)[number];

/**
 * 路由级主题配置（viewTransition / pendingMs）
 * 通过 vite.config.ts 的 `define` 注入为全局常量 __THEME_CONFIG__
 *
 * 注意：这与 contract/config.ts 中的 ThemeConfig（数据获取参数）是不同的接口。
 */
export interface ThemeRouterConfig {
  viewTransition: boolean; // 是否开启路由级的 viewTransition 过渡动画
  pendingMs?: number; // 路由 pending 状态延迟展示的毫秒数；未设置时由消费方决定行为
}

export const themes: Record<ThemeName, ThemeRouterConfig> = {
  default: {
    viewTransition: true,
    pendingMs: 0,
  },
  fuwari: {
    viewTransition: false,
    pendingMs: 1000,
  },
  cuckoo: {
    viewTransition: false,
    pendingMs: 1000,
  },
};
