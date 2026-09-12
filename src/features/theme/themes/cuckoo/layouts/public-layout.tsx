import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";
import { BackToTop } from "../components/control/back-to-top";
import { Sidebar } from "../components/sidebar";
import { Appbar } from "./appbar";
import { Drawer } from "./drawer";
import { Footer } from "./footer";

/** 未配置背景图时的兜底渐变(Material Pink 风格) */
const FALLBACK_BACKGROUND =
  "linear-gradient(135deg, oklch(0.85 0.09 15) 0%, oklch(0.9 0.06 60) 45%, oklch(0.85 0.08 300) 100%)";

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const bg = siteConfig.theme.cuckoo.bg;

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* 固定全屏背景(对应原主题 .background) */}
      <div
        className="cuckoo-background"
        style={{
          backgroundImage: bg ? `url(${bg})` : FALLBACK_BACKGROUND,
        }}
      />

      <Drawer
        navOptions={navOptions}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        logout={logout}
      />

      <Appbar
        navOptions={navOptions}
        onMenuClick={() => setIsDrawerOpen(true)}
        user={user}
        isLoading={isSessionLoading}
      />

      {/* 主容器:8/4 双栏(对应原主题 .index-container) */}
      <div className="relative z-10 mx-auto grid w-full max-w-(--cuckoo-page-width) flex-1 grid-cols-1 gap-0 px-4 pt-16 pb-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
        <main className="min-w-0">{children}</main>
        <Sidebar className="mt-5 lg:mt-0" />
      </div>

      <Footer />
      <BackToTop />
    </div>
  );
}
