import { Link } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { blogConfig } from "@/blog.config";
import type { UserInfo } from "@/features/theme/contract/layouts";

interface NavbarProps {
  onMenuClick: () => void;
  user?: UserInfo;
}

export function Navbar({ onMenuClick, user }: NavbarProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 cuckoo-glass-card mb-6">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Menu button (mobile) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
          aria-label="菜单"
        >
          <Menu size={20} />
        </button>

        {/* Center: Logo / Site name */}
        <Link
          to="/"
          className="text-lg font-bold cuckoo-text-primary hover:cuckoo-primary transition-colors"
        >
          {user?.name || blogConfig.title}
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
            aria-label="搜索"
          >
            <Search size={20} />
          </Link>
          <button
            onClick={toggleTheme}
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
            aria-label="切换主题"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {user && (
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 cuckoo-btn cuckoo-btn-secondary h-9 px-3"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="cuckoo-avatar cuckoo-avatar-sm"
                />
              ) : (
                <span className="cuckoo-text-secondary text-sm">
                  {user.name}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
