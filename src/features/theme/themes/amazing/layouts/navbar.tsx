import { Link, useRouteContext } from "@tanstack/react-router";
import { Home, Menu, Search, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";
import { LanguageSwitcher } from "./language-switcher";

interface NavbarProps {
  navOptions: Array<NavOption>;
  onMenuClick: () => void;
  onSearchClick: () => void;
  isLoading?: boolean;
  user?: UserInfo;
  bannerHeightVh: number;
}

const NAVBAR_HEIGHT_REM = 4.5;
const MAIN_OVERLAP_REM = 3.5;

/**
 * Water Glass Navbar — Amazing Theme
 *
 * Features:
 * - Radial gradient glow following mouse position (liquid glass effect)
 * - backdrop-filter: blur + saturate for frosted glass
 * - Search triggers overlay instead of navigation
 * - Smooth hide/show based on scroll position
 */
export function Navbar({
  onMenuClick,
  onSearchClick,
  user,
  navOptions,
  isLoading,
  bannerHeightVh,
}: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [isHidden, setIsHidden] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);

  // Water glass: track mouse position for radial gradient glow
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = navbarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
  }, []);

  // Hide navbar after scrolling past banner
  useEffect(() => {
    const handleScroll = () => {
      const bannerHeightPx = window.innerHeight * (bannerHeightVh / 100);
      const navbarHeightPx = NAVBAR_HEIGHT_REM * 16;
      const mainOverlapPx = MAIN_OVERLAP_REM * 16;
      const extraPaddingPx = 16;

      const threshold =
        bannerHeightPx - navbarHeightPx - mainOverlapPx - extraPaddingPx;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      setIsHidden(scrollTop >= threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [bannerHeightVh]);

  return (
    <div
      id="fuwari-navbar-wrapper"
      className={`z-50 sticky top-0 transition-all duration-500 ease-out ${
        isHidden
          ? "-translate-y-16 opacity-0 pointer-events-none blur-sm"
          : "translate-y-0 opacity-100 blur-0"
      }`}
    >
      <div
        id="fuwari-navbar"
        ref={navbarRef}
        onMouseMove={handleMouseMove}
        className="fuwari-onload-animation"
        style={{ animationDelay: "0ms" }}
      >
        <div className="amazing-navbar-glass overflow-visible! rounded-t-none! rounded-b-2xl mx-auto flex items-center justify-between px-4 h-18 max-w-(--fuwari-page-width) shadow-lg shadow-black/[0.03] dark:shadow-white/[0.02]">
          {/* Home logo */}
          <Link
            to="/"
            className="fuwari-expand-animation rounded-lg h-13 px-5 font-bold active:scale-95 flex items-center group"
          >
            <Home
              size={28}
              strokeWidth={1.5}
              className="text-(--fuwari-primary) mr-2 shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110 duration-300"
            />
            <span className="text-(--fuwari-primary) text-base">
              {siteConfig.title}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navOptions.map((option) => (
              <Link
                key={option.id}
                to={option.to}
                className="fuwari-expand-animation rounded-lg h-11 font-bold px-5 active:scale-95 flex items-center fuwari-text-75 hover:text-(--fuwari-primary) transition-colors duration-200"
                activeProps={{
                  className: "!text-[var(--fuwari-primary)]",
                }}
              >
                {option.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Desktop search trigger → opens overlay */}
            <button
              onClick={onSearchClick}
              className="hidden lg:flex items-center h-11 mr-2 rounded-lg bg-black/4 hover:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 transition-all active:scale-95 group w-52 hover:shadow-[0_0_20px_rgba(var(--amazing-primary-rgb),0.1)]"
              aria-label={m.nav_search()}
            >
              <Search
                size={18}
                className="ml-3 transition-colors text-black/30 dark:text-white/30 group-hover:text-black/50 dark:group-hover:text-white/50"
                strokeWidth={1.25}
              />
              <span className="ml-2 text-black/50 dark:text-white/50 text-sm bg-transparent outline-none truncate">
                {m.nav_search()}
              </span>
              <kbd className="ml-auto mr-3 text-[10px] font-mono text-black/25 dark:text-white/25 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search trigger → opens overlay */}
            <button
              onClick={onSearchClick}
              className="lg:hidden fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary)"
              aria-label={m.nav_search()}
            >
              <Search size={18} strokeWidth={1.25} />
            </button>

            <ThemeToggle className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) p-0! bg-transparent! [&_svg]:w-4.5! [&_svg]:h-4.5! [&_div]:w-auto! [&_div]:h-auto!" />
            <LanguageSwitcher className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) p-0! bg-transparent! [&_svg]:w-4.5! [&_svg]:h-4.5!" />

            {/* User section (desktop) */}
            <div className="hidden md:flex items-center">
              {isLoading ? (
                <Skeleton className="w-9 h-9 rounded-lg" />
              ) : user ? (
                <Link
                  to="/profile"
                  className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-8 h-8 rounded-md object-cover ring-2 ring-transparent hover:ring-(--fuwari-primary)/30 transition-all"
                    />
                  ) : (
                    <div className="w-full h-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center">
                      <UserIcon
                        size={18}
                        strokeWidth={1.25}
                        className="fuwari-text-50"
                      />
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary)"
                  aria-label={m.nav_login()}
                >
                  <UserIcon size={18} strokeWidth={1.25} />
                </Link>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="fuwari-expand-animation rounded-lg w-11 h-11 flex items-center justify-center active:scale-90 md:hidden fuwari-text-75 hover:text-(--fuwari-primary)"
              onClick={onMenuClick}
              aria-label={m.common_open_menu()}
              type="button"
            >
              <Menu size={18} strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
