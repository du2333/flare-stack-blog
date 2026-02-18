import { Link } from "@tanstack/react-router";
import { Search, UserIcon } from "lucide-react";
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
}

export function Navbar({
  onMenuClick,
  user,
  navOptions,
  isLoading,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 flex items-center transition-all duration-500 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border/40 py-4 shadow-sm"
            : "bg-transparent border-transparent py-8"
        }`}
      >
        <div className="max-w-3xl mx-auto w-full px-6 md:px-0 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/" className="group select-none">
            <span className="font-serif text-xl font-bold tracking-tighter text-foreground transition-colors group-hover:text-muted-foreground">
              [ {blogConfig.name} ]
            </span>
          </Link>

          {/* Center: Main Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navOptions.map((option) => (
              <Link
                key={option.id}
                to={option.to}
                className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
                activeProps={{
                  className: "!text-foreground",
                }}
              >
                {option.label}
              </Link>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                to="/search"
                className="text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center transition-colors"
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
                          className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border hover:ring-foreground transition-all relative z-10"
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
                        className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
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
                <div className="w-5 h-px bg-foreground transition-all group-hover:w-3"></div>
                <div className="w-5 h-px bg-foreground transition-all group-hover:w-6"></div>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-32"></div>
    </>
  );
}
