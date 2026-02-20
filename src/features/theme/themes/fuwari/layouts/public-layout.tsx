import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sidebar } from "../components/sidebar";
import { BackToTop } from "../components/control/back-to-top";
import { Footer } from "./footer";
import { MobileMenu } from "./mobile-menu";
import { Navbar } from "./navbar";
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";
import { blogConfig } from "@/blog.config";

const BANNER_HEIGHT_HOME = 65;
const BANNER_HEIGHT_PAGE = 35;
const MAIN_OVERLAP_REM = 3.5;
const NAVBAR_HEIGHT_REM = 4.5;

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const bannerHeightVh = isHomePage ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE;

  return (
    <div className="relative min-h-screen bg-(--fuwari-page-bg) transition-colors">
      <MobileMenu
        navOptions={navOptions}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        logout={logout}
      />

      {/* Top row: Navbar - sticky */}
      <div className="sticky top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto max-w-(--fuwari-page-width) mx-auto px-0 md:px-4">
          <Navbar
            navOptions={navOptions}
            onMenuClick={() => setIsMenuOpen(true)}
            user={user}
            isLoading={isSessionLoading}
            bannerHeightVh={bannerHeightVh}
          />
        </div>
      </div>

      {/* Banner - full width background */}
      <div
        className="absolute left-0 right-0 top-0 z-10 overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: `${bannerHeightVh}vh` }}
      >
        <img
          src={blogConfig.theme.fuwari.homeBg}
          alt=""
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Main content - overlaps banner by MAIN_OVERLAP_REM */}
      <div
        className="relative z-30 transition-[margin-top] duration-300 ease-in-out"
        style={{
          marginTop: `calc(${bannerHeightVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem)`,
        }}
      >
        <div
          className="relative mx-auto px-0 md:px-4 pb-8 grid grid-cols-1 lg:grid-cols-[17.5rem_1fr] gap-4"
          style={{ maxWidth: "var(--fuwari-page-width)" }}
        >
          {/* Sidebar Column */}
          <Sidebar className="order-2 lg:order-1" />

          {/* Main Content Column */}
          <main className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
            {children}
          </main>

          {/* Footer Column (Desktop: below main, Mobile: below sidebar) */}
          <div
            className="order-3 lg:col-start-2 fuwari-onload-animation mt-auto"
            style={{ animationDelay: "250ms" }}
          >
            <Footer navOptions={navOptions} />
          </div>

          <BackToTop />
        </div>
      </div>
    </div>
  );
}
