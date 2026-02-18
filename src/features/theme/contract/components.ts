import type { HomePageProps } from "./pages";

/**
 * 主题契约 — 组件接口
 *
 * 每个主题的 index.ts 必须导出一个满足此接口的对象。
 * TypeScript 在编译时验证主题实现了所有必须的组件。
 */
export interface ThemeComponents {
  /** 主页渲染组件 */
  HomePage: React.ComponentType<HomePageProps>;
  /** 主页加载中骨架屏（用于 TanStack Router pendingComponent） */
  HomePageSkeleton: React.ComponentType;
}
