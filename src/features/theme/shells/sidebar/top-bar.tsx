import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { useMenuPanel } from "@/components/layout/use-menu-panel";
import { IconButton, iconButtonClass } from "@/components/ui/icon-button";
import { m } from "@/paraglide/messages";
import { Brand } from "./brand";
import type { RailProps } from "./rail";

const PANEL_ID = "sidebar-navigation-panel";

/**
 * What stands in for the rail below 1024px: a bar that stays at the top of
 * the window with the brand, search and the shared compact menu, which
 * holds the navigation entries, the switches and the account actions.
 */
export function TopBar({ navOptions, user, isLoading, logout }: RailProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { open, present, toggle, close, panelProps } = useMenuPanel(pathname);

  return (
    <header className="sidebar-topbar">
      <div className="sidebar-topbar-inner">
        <Brand />
        <Link
          to="/search"
          className={iconButtonClass({ size: "lg" })}
          aria-label={m.nav_search()}
          title={m.nav_search()}
        >
          <Search size={20} strokeWidth={1.75} />
        </Link>
        <IconButton
          size="lg"
          label={open ? m.common_close() : m.common_open_menu()}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={(event) => toggle(event.currentTarget, true)}
        >
          <span className="sidebar-burger" data-open={open}>
            <Menu size={20} strokeWidth={1.75} />
            <X size={20} strokeWidth={1.75} />
          </span>
        </IconButton>
        {present ? (
          <div
            {...panelProps}
            id={PANEL_ID}
            className="sidebar-panel sidebar-topbar-panel fuwari-popover-motion"
          >
            <MobileMenu
              navOptions={navOptions}
              user={user}
              isLoading={isLoading}
              logout={logout}
              mobile
              onClose={close}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
