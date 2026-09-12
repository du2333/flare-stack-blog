import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Menu, Search, User as UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { LanguageSwitcher } from "./language-switcher";

interface AppbarProps {
  navOptions: Array<NavOption>;
  onMenuClick: () => void;
  user?: UserInfo;
  isLoading?: boolean;
}

/**
 * 顶部工具栏(对应原主题 .mdui-appbar):
 * 透明悬浮于背景之上,滚动后变为毛玻璃卡片。
 */
export function Appbar({ onMenuClick, user, isLoading }: AppbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const navigate = useNavigate();
  const [isSolid, setIsSolid] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsSolid(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearchOpen(false);
    setQuery("");
    navigate({ to: "/search", search: { q: trimmed } });
  };

  return (
    <header
      className={cn(
        "cuckoo-appbar fixed inset-x-0 top-0 z-50",
        isSolid && "cuckoo-appbar-solid",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-(--cuckoo-page-width) items-center px-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="cuckoo-appbar-icon"
          aria-label={m.common_open_menu()}
        >
          <Menu size={20} />
        </button>

        <Link
          to="/"
          className="cuckoo-expand-animation ml-3 truncate text-lg font-medium hover:opacity-80"
        >
          {siteConfig.title}
        </Link>

        <div className="flex-1" />

        {/* 展开式搜索(对应原主题 .mdui-textfield-expandable) */}
        {isSearchOpen ? (
          <form
            onSubmit={submitSearch}
            className="cuckoo-appbar-search flex items-center gap-1"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                if (!query) setIsSearchOpen(false);
              }}
              placeholder={m.nav_search_cuckoo()}
              className="w-36 rounded-none px-2 py-1 text-sm md:w-56"
              aria-label={m.nav_search()}
            />
            <button
              type="button"
              className="cuckoo-appbar-icon"
              onClick={() => {
                setIsSearchOpen(false);
                setQuery("");
              }}
              aria-label={m.search_back()}
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="cuckoo-appbar-icon"
            onClick={() => setIsSearchOpen(true)}
            aria-label={m.nav_search()}
          >
            <Search size={20} />
          </button>
        )}

        <ThemeToggle className="cuckoo-appbar-icon p-0! bg-transparent! shadow-none! border-none! [&_svg]:w-4.5! [&_svg]:h-4.5! [&_div]:w-auto! [&_div]:h-auto!" />
        <LanguageSwitcher className="cuckoo-appbar-icon p-0! bg-transparent! shadow-none! border-none! [&_svg]:w-4.5! [&_svg]:h-4.5!" />

        {isLoading ? (
          <Skeleton className="cuckoo-appbar-icon bg-white/30!" />
        ) : user ? (
          <Link
            to="/profile"
            className="cuckoo-appbar-icon"
            aria-label={m.profile_title()}
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <UserIcon size={20} />
            )}
          </Link>
        ) : (
          <Link
            to="/login"
            className="cuckoo-appbar-icon"
            aria-label={m.nav_login()}
          >
            <UserIcon size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}
