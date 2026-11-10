import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PublicNavLink } from "./public-nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale } from "@/paraglide/runtime";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
  mobile: boolean;
  isLoading?: boolean;
}

/** Shared account actions; the compact navigation also includes links and preferences. */
export function MobileMenu({
  navOptions,
  onClose,
  user,
  logout,
  mobile,
  isLoading,
}: MobileMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const { colourSchemePreference } = useColourScheme();
  const schemeLabel =
    colourSchemePreference === "light"
      ? m.colour_scheme_light()
      : colourSchemePreference === "dark"
        ? m.colour_scheme_dark()
        : m.colour_scheme_system();
  return (
    <>
      {mobile && (
        <>
          <nav className="public-menu-links">
            {navOptions.map((option) => (
              <PublicNavLink
                key={option.id}
                option={option}
                onClick={onClose}
                className="public-menu-item"
                activeClassName="public-menu-active"
              />
            ))}
          </nav>
          <div className="public-menu-preferences">
            <ColourSchemeToggle
              className="public-menu-colour-scheme"
              label={schemeLabel}
            />
            <SegmentedControl
              className="public-menu-languages"
              aria-label={m.common_switch_language()}
              track={false}
              size="sm"
              value={getLocale()}
              onValueChange={(locale) => setLocale(locale)}
              items={[
                { value: "zh", label: "中文" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </>
      )}
      {isLoading ? (
        <div className="public-menu-loading" aria-busy="true">
          <Skeleton className="h-6" />
        </div>
      ) : user ? (
        <>
          <div className="public-menu-identity">
            {user.image ? (
              <img src={user.image} alt="" />
            ) : (
              <UserIcon size={24} />
            )}
            <span>{user.name}</span>
          </div>
          <Link to="/profile" onClick={onClose} className="public-menu-item">
            <UserIcon size={18} />
            {m.profile_title()}
          </Link>
          {user.role === "admin" && (
            <Link to="/admin" onClick={onClose} className="public-menu-item">
              <Settings size={18} />
              {m.profile_admin_dashboard_fuwari()}
            </Link>
          )}
          <button
            type="button"
            disabled={loggingOut}
            className="public-menu-item public-menu-logout"
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
                onClose();
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            <LogOut size={18} />
            {m.profile_logout_fuwari()}
          </button>
        </>
      ) : (
        <Link
          to="/login"
          onClick={onClose}
          className="public-menu-item public-menu-active"
        >
          <UserIcon size={18} />
          {m.nav_login_register()}
        </Link>
      )}
    </>
  );
}
