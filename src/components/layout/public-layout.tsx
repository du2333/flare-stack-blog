import {
  useLocation,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import type { PublicLayoutProps } from "@/components/layout/layout-props";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";
import { BackToTop } from "./back-to-top";
import { Footer } from "./footer";
import { MobileMenu } from "./mobile-menu";
import { Navbar } from "./navbar";
import { PageFade } from "./page-fade";
import { Sidebar } from "./sidebar";

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
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isAuthPage = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId.includes("/_auth")),
  });
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
        className="absolute left-0 right-0 top-0 z-10 overflow-hidden transition-[height] duration-700"
        style={{ height: `${bannerHeightVh}vh` }}
      >
        <img
          src={getPublicImageSrc(
            siteConfig.theme.fuwari.homeBg,
            PUBLIC_IMAGE_WIDTH.banner,
          )}
          alt="banner"
          fetchPriority="high"
          className="fuwari-banner-image w-full h-full object-cover object-center"
        />
      </div>

      {/* Main content - overlaps banner by MAIN_OVERLAP_REM */}
      <div
        className="relative z-30 transition-[margin-top] duration-700"
        style={{
          marginTop: `calc(${bannerHeightVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem)`,
        }}
      >
        <div
          className={cn(
            "relative mx-auto px-0 md:px-4 pb-8 grid gap-4",
            isAuthPage
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[17.5rem_1fr]",
          )}
          style={{ maxWidth: "var(--fuwari-page-width)" }}
        >
          {isAuthPage ? null : <Sidebar className="order-2 lg:order-1" />}

          <main
            className={cn(
              "flex flex-col gap-4 min-w-0",
              isAuthPage ? "" : "order-1 lg:order-2",
            )}
          >
            <PageFade includeSearch={location.pathname !== "/search"}>
              {children}
            </PageFade>
          </main>

          <div
            className={cn(
              "fuwari-onload-animation mt-auto",
              isAuthPage ? "" : "order-3 lg:col-start-2",
            )}
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
