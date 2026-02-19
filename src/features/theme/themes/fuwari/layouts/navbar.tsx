import { Link } from "@tanstack/react-router";
import { Home, Menu, Search, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { blogConfig } from "@/blog.config";

interface NavbarProps {
  navOptions: Array<NavOption>;
  onMenuClick: () => void;
  isLoading?: boolean;
  user?: UserInfo;
  bannerHeightVh: number;
}

const NAVBAR_HEIGHT_REM = 4.5;
const MAIN_OVERLAP_REM = 3.5;

export function Navbar({
  onMenuClick,
  user,
  navOptions,
  isLoading,
  bannerHeightVh,
}: NavbarProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate threshold based on banner height and layout
      const bannerHeightPx = window.innerHeight * (bannerHeightVh / 100);
      const navbarHeightPx = NAVBAR_HEIGHT_REM * 16;
      const mainOverlapPx = MAIN_OVERLAP_REM * 16;
      const extraPaddingPx = 16;

      const threshold = bannerHeightPx - navbarHeightPx - mainOverlapPx - extraPaddingPx;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      setIsHidden(scrollTop >= threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [bannerHeightVh]);

  return (
    <div
      id="fuwari-navbar-wrapper"
      className={`z-50 sticky top-0 transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-16 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div
        id="fuwari-navbar"
        className="fuwari-onload-animation"
        style={{ animationDelay: "0ms" }}
      >
        <div className="fuwari-card-base !overflow-visible !rounded-t-none mx-auto flex items-center justify-between px-4 h-[4.5rem] max-w-[var(--fuwari-page-width)]">
          <Link
          to="/"
          className="fuwari-expand-animation rounded-lg h-[3.25rem] px-5 font-bold active:scale-95 flex items-center"
        >
          <Home
            size={28}
            strokeWidth={1.5}
            className="text-[var(--fuwari-primary)] mr-2 flex-shrink-0"
          />
          <span className="text-[var(--fuwari-primary)] text-base">
            {blogConfig.title}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navOptions.map((option) => (
            <Link
              key={option.id}
              to={option.to}
              className="fuwari-expand-animation rounded-lg h-11 font-bold px-5 active:scale-95 flex items-center fuwari-text-75 hover:text-[var(--fuwari-primary)]"
              activeProps={{
                className: "!text-[var(--fuwari-primary)]",
              }}
            >
              {option.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-[var(--fuwari-primary)]"
            aria-label="搜索"
          >
            <Search size={20} strokeWidth={1.5} />
          </Link>
          <ThemeToggle className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-[var(--fuwari-primary)] !p-0 !bg-transparent [&_svg]:!w-5 [&_svg]:!h-5 [&_div]:!w-auto [&_div]:!h-auto" />
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
                    className="w-8 h-8 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--fuwari-btn-regular-bg)] flex items-center justify-center">
                    <UserIcon size={18} className="fuwari-text-50" />
                  </div>
                )}
              </Link>
            ) : (
              <Link
                to="/login"
                className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-[var(--fuwari-primary)]"
                aria-label="登录"
              >
                <UserIcon size={20} strokeWidth={1.5} />
              </Link>
            )}
          </div>
          <button
            className="fuwari-expand-animation rounded-lg w-11 h-11 flex items-center justify-center active:scale-90 md:hidden fuwari-text-75 hover:text-[var(--fuwari-primary)]"
            onClick={onMenuClick}
            aria-label="打开菜单"
            type="button"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}