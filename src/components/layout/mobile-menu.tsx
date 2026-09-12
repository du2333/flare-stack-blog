import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/common/theme-provider";
import { ThemeToggle } from "@/components/common/theme-toggle";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { PublicNavLink } from "./public-nav-link";
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
  const { userTheme } = useTheme();
  const themeLabel =
    userTheme === "light"
      ? m.theme_light()
      : userTheme === "dark"
        ? m.theme_dark()
        : m.theme_system();
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
            <ThemeToggle className="public-menu-theme" label={themeLabel} />
            <div
              className="public-menu-languages"
              role="group"
              aria-label={m.common_switch_language()}
            >
              <button
                type="button"
                aria-pressed={getLocale() === "zh"}
                onClick={() => setLocale("zh")}
              >
                中文
              </button>
              <button
                type="button"
                aria-pressed={getLocale() === "en"}
                onClick={() => setLocale("en")}
              >
                English
              </button>
            </div>
          </div>
        </>
      )}
      {isLoading ? (
        <div className="public-menu-loading" aria-busy="true">
          <span className="animate-pulse" />
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
