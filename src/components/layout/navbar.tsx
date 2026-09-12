import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { ChevronDown, Home, Menu, Search, UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import type { NavOption, UserInfo } from "./layout-props";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { LanguageSwitcher } from "./language-switcher";
import { PublicNavLink } from "./public-nav-link";
import { MobileMenu } from "./mobile-menu";
import "./navbar.css";

interface NavbarProps {
  navOptions: Array<NavOption>;
  isLoading?: boolean;
  user?: UserInfo;
  logout: () => Promise<void>;
  bannerHeightVh: number;
}

export function Navbar({
  user,
  navOptions,
  isLoading,
  logout,
  bannerHeightVh,
}: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const [isHidden, setIsHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const present = useMotionPresence(open, MOTION.popover);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOpen(false);
    setIsHidden(false);
  }, [pathname]);
  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let travel = 0;
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - previous;
      previous = y;
      if (
        open ||
        (rootRef.current?.contains(document.activeElement) &&
          document.activeElement?.matches(":focus-visible")) ||
        rootRef.current?.querySelector('[aria-expanded="true"]')
      ) {
        travel = 0;
        setIsHidden(false);
        return;
      }
      const threshold = Math.max(
        72,
        (window.innerHeight * bannerHeightVh) / 100 - 144,
      );
      if (y < threshold) {
        travel = 0;
        setIsHidden(false);
        return;
      }
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;
      if (Math.abs(travel) >= 12) {
        setIsHidden(travel > 0);
        travel = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [bannerHeightVh, open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>("a, button")
      ?.focus({ preventScroll: true });
    const pointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  const toggle = (button: HTMLButtonElement, compact: boolean) => {
    triggerRef.current = button;
    setMobile(compact);
    setOpen((value) => !value);
    setIsHidden(false);
  };

  return (
    <div
      ref={rootRef}
      id="fuwari-navbar-wrapper"
      className="public-navbar-wrapper"
      data-hidden={isHidden && !open}
      onFocusCapture={() => setIsHidden(false)}
    >
      <div id="fuwari-navbar" className="public-navbar fuwari-card-base">
        <Link to="/" className="public-brand" title={siteConfig.title}>
          <Home size={28} strokeWidth={1.5} />
          <span>{siteConfig.title}</span>
        </Link>
        <nav className="public-desktop-links">
          {navOptions.map((option) => (
            <PublicNavLink
              key={option.id}
              option={option}
              className="public-nav-link"
              activeClassName="public-nav-active"
            />
          ))}
        </nav>
        <div className="public-nav-tools">
          <Link
            to="/search"
            className="public-nav-search"
            aria-label={m.nav_search()}
          >
            <Search size={18} strokeWidth={1.5} />
            <span>{m.nav_search()}</span>
          </Link>
          <div className="public-desktop-tools">
            <ThemeToggle className="public-tool-button" />
            <LanguageSwitcher className="public-tool-button" />
            <button
              type="button"
              className="public-tool-button public-account-trigger"
              aria-label={user ? m.profile_title() : m.nav_login_register()}
              aria-expanded={open && !mobile}
              aria-controls="public-navigation-panel"
              onClick={(event) => toggle(event.currentTarget, false)}
            >
              {isLoading ? (
                <Skeleton className="w-7 h-7 rounded-lg" />
              ) : user?.image ? (
                <img src={user.image} alt="" />
              ) : (
                <UserIcon size={18} strokeWidth={1.5} />
              )}
              <ChevronDown size={12} />
            </button>
          </div>
          <button
            type="button"
            className="public-tool-button public-mobile-trigger"
            aria-label={
              open && mobile ? m.common_close() : m.common_open_menu()
            }
            aria-expanded={open && mobile}
            aria-controls="public-navigation-panel"
            onClick={(event) => toggle(event.currentTarget, true)}
          >
            {open && mobile ? (
              <X size={20} strokeWidth={1.5} />
            ) : (
              <Menu size={20} strokeWidth={1.5} />
            )}
          </button>
        </div>
        {present && (
          <div
            ref={panelRef}
            id="public-navigation-panel"
            className="public-navigation-panel fuwari-popover-motion"
            data-state={open ? "open" : "closing"}
            inert={!open}
            aria-hidden={!open}
            onBlur={(event) => {
              if (
                event.relatedTarget &&
                !event.currentTarget.contains(event.relatedTarget as Node) &&
                event.relatedTarget !== triggerRef.current
              )
                setOpen(false);
            }}
          >
            <MobileMenu
              navOptions={navOptions}
              user={user}
              isLoading={isLoading}
              logout={logout}
              mobile={mobile}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
