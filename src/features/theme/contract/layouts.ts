import type { FileRoutesByTo } from "@/routeTree.gen";

/**
 * 主题契约 — 布局 Props 接口
 */

export interface NavOption {
  label: string;
  to: keyof FileRoutesByTo;
  id: string;
}

export interface UserInfo {
  name: string;
  image?: string | null;
  role?: string | null;
}

export interface PublicLayoutProps {
  children: React.ReactNode;
  navOptions: Array<NavOption>;
  user?: UserInfo;
  isSessionLoading: boolean;
  logout: () => Promise<void>;
}

export interface AuthLayoutProps {
  onBack: () => void;
  children: React.ReactNode;
}

export interface UserLayoutProps {
  isAuthenticated: boolean;
  navOptions: Array<NavOption>;
  user?: UserInfo;
  isSessionLoading: boolean;
  logout: () => Promise<void>;
  children: React.ReactNode;
}
