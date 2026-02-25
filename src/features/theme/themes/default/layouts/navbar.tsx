import { Link, useRouterState } from "@tanstack/react-router";
import { Search, UserIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { blogConfig } from "@/blog.config";

interface NavbarProps {
  navOptions: Array<NavOption>;
  onMenuClick: () => void;
  isLoading?: boolean;
  user?: UserInfo;
}

export function Navbar({
  onMenuClick,
  user,
  navOptions,
  isLoading,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 计算当前激活链接并更新指示器位置
  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    // 找到当前激活的 nav option
    const activeOption = navOptions.find((opt) =>
      opt.to === "/" ? pathname === "/" : pathname.startsWith(opt.to)
    );
    if (!activeOption) {
      setIndicator(null);
      return;
    }
    const el = linkRefs.current.get(activeOption.id);
    if (!el) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
  }, [navOptions, pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateIndicator covers dependencies
  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // 窗口 resize 时重新定位
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const setLinkRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) linkRefs.current.set(id, el);
    else linkRefs.current.delete(id);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 flex items-center ${
          isScrolled
            ? "bg-background/60 backdrop-blur-xl backdrop-saturate-150 border-b border-border/20 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            : "bg-transparent border-transparent py-8"
        }`}
        style={{
          transition: `all 500ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
        }}
      >
        <div className="max-w-3xl mx-auto w-full px-6 md:px-0 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/" className="group select-none">
            <span className="font-serif text-xl font-bold tracking-tighter text-foreground transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:text-muted-foreground group-hover:tracking-tight">
              [ {blogConfig.name} ]
            </span>
          </Link>

          {/* Center: Main Nav */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-8 relative">
            {navOptions.map((option) => (
              <Link
                key={option.id}
                ref={setLinkRef(option.id)}
                to={option.to}
                className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60 hover:text-accent transition-colors duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] relative py-1"
                activeProps={{
                  className: "!text-accent",
                }}
              >
                {option.label}
              </Link>
            ))}
            {/* 滑动指示器 — 弹性过冲动画 */}
            {indicator && (
              <div
                className="absolute bottom-[-4px] h-px bg-accent pointer-events-none"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                  transition: "left 500ms cubic-bezier(0.34, 1.56, 0.64, 1), width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            )}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                to="/search"
                className="text-muted-foreground hover:text-accent h-8 w-8 flex items-center justify-center transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95"
              >
                <Search
                  size={16}
                  strokeWidth={1.5}
                  style={{ viewTransitionName: "search-input" }}
                />
              </Link>
            </div>

            {/* Profile / Menu Toggle */}
            <div className="flex items-center gap-3 pl-3">
              <div className="hidden md:flex items-center">
                {isLoading ? (
                  <Skeleton className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="flex items-center gap-3 animate-in fade-in">
                    {user ? (
                      <>
                        <Link
                          to="/profile"
                          className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border hover:ring-foreground/50 transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95 relative z-10"
                          style={{ viewTransitionName: "user-avatar" }}
                        >
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <UserIcon
                                size={12}
                                className="text-muted-foreground"
                              />
                            </div>
                          )}
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                      >
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <button
                className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 group lg:hidden"
                onClick={onMenuClick}
                aria-label="打开菜单"
                type="button"
              >
                <div className="w-5 h-px bg-foreground transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:w-3"></div>
                <div className="w-5 h-px bg-foreground transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:w-6"></div>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-32"></div>
    </>
  );
}
