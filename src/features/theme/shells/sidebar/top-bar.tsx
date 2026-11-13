import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isNavGroup } from "@/components/layout/nav-options";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { IconButton, iconButtonClass } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { m } from "@/paraglide/messages";
import { Brand } from "./brand";
import { entryIcon, GROUP_ICON } from "./nav-entry";
import type { RailProps } from "./rail";

const DRAWER_ID = "sidebar-navigation-drawer";

/**
 * What stands in for the rail below 1024px: a bar that stays at the top of
 * the window with the menu button, the brand and search. The button brings
 * the rail in from the left as a drawer over the page: the brand, every
 * navigation entry as a row led by its icon, as in the rail, then the
 * account and the switches at its foot (the shared compact menu,
 * mobile-menu.tsx). It closes on a navigation, on Escape, on a press beside
 * it, and where the window becomes wide enough for the rail itself.
 */
export function TopBar({ navOptions, user, isLoading, logout }: RailProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const resize = () => setOpen(false);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  return (
    <>
      <header className="sidebar-topbar">
        <div className="sidebar-topbar-inner">
          <IconButton
            size="lg"
            label={m.common_open_menu()}
            aria-expanded={open}
            aria-controls={DRAWER_ID}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} strokeWidth={1.75} />
          </IconButton>
          <Brand />
          <Link
            to="/search"
            className={iconButtonClass({ size: "lg" })}
            aria-label={m.nav_search()}
            title={m.nav_search()}
          >
            <Search size={20} strokeWidth={1.75} />
          </Link>
        </div>
      </header>
      <Sheet
        open={open}
        onClose={close}
        side="left"
        as="aside"
        id={DRAWER_ID}
        aria-label={m.nav_menu_label()}
        className="sidebar-drawer"
        backdropClassName="sidebar-drawer-backdrop"
      >
        <div className="sidebar-drawer-head">
          <Brand />
          <IconButton size="lg" label={m.common_close()} onClick={close}>
            <X size={20} strokeWidth={1.75} />
          </IconButton>
        </div>
        <div className="sidebar-drawer-body">
          <MobileMenu
            navOptions={navOptions}
            user={user}
            isLoading={isLoading}
            logout={logout}
            mobile
            onClose={close}
            lead={(option) => {
              const Icon = isNavGroup(option) ? GROUP_ICON : entryIcon(option);
              return (
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="sidebar-drawer-icon"
                />
              );
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
