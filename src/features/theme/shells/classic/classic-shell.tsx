import { useRouteContext } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type { ThemeShell, ThemeShellProps } from "@/features/theme/theme-shell";
import { cn } from "@/lib/utils";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

const BANNER_HEIGHT_HOME = 65;
const BANNER_HEIGHT_PAGE = 35;
const MAIN_OVERLAP_REM = 3.5;
const NAVBAR_HEIGHT_REM = 4.5;

/** 「经典」: a sticky navbar over a banner, the sidebar cards left of the content. */
function ClassicShell({
  pageKind,
  navOptions,
  sidebarCards,
  user,
  isSessionLoading,
  logout,
  children,
  footer,
  floatingActions,
}: ThemeShellProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const isHomePage = pageKind === "home";
  const isFocusedPage = pageKind === "focused";
  const bannerHeightVh = isHomePage ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE;
  // The banner is the first screen.
  const firstScreenHeight = useCallback(
    () => (window.innerHeight * bannerHeightVh) / 100,
    [bannerHeightVh],
  );

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="relative min-h-screen bg-(--fuwari-page-bg) transition-colors"
        data-theme-shell="classic"
      >
        {/* Top row: Navbar - sticky */}
        <div className="sticky top-0 z-50 pointer-events-none">
          <div className="pointer-events-auto max-w-(--fuwari-page-width) mx-auto px-0 md:px-4">
            <Navbar
              navOptions={navOptions}
              logout={logout}
              user={user}
              isLoading={isSessionLoading}
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
            fetchPriority={isHomePage ? "high" : "auto"}
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
              "public-content-grid relative mx-auto px-0 md:px-4 pb-8 grid gap-4",
              isFocusedPage
                ? "grid-cols-1"
                : "grid-cols-1 lg:grid-cols-[17.5rem_1fr]",
            )}
            style={{ maxWidth: "var(--fuwari-page-width)" }}
            data-shell-region="body"
          >
            {isFocusedPage ? null : (
              <Sidebar
                className="public-sidebar order-2 lg:order-1"
                cards={sidebarCards}
              />
            )}

            <main
              className={cn(
                "flex flex-col gap-4 min-w-0",
                isFocusedPage ? "" : "order-1 lg:order-2",
              )}
              data-shell-region="main"
            >
              {children}
            </main>

            <div
              className={cn(
                "public-footer fuwari-onload-animation mt-auto",
                isFocusedPage ? "" : "order-3 lg:col-start-2",
              )}
              style={{ animationDelay: "250ms" }}
              data-shell-region="footer"
            >
              {footer}
            </div>

            {floatingActions}
          </div>
        </div>
      </div>
    </FirstScreenProvider>
  );
}

export const classicShell: ThemeShell = {
  id: "classic",
  Shell: ClassicShell,
  identityInFirstScreen: [],
};
