import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronRight,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import type {
  NavLinkOption,
  NavOption,
  UserInfo,
} from "@/components/layout/layout-props";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isNavGroup } from "./nav-options";
import { PublicNavLink } from "./public-nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale } from "@/paraglide/runtime";
import "./mobile-menu.css";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
  mobile: boolean;
  isLoading?: boolean;
  /** What leads a navigation entry's row, such as its icon. */
  lead?: (option: NavOption) => ReactNode;
}

/** A link of the navigation as a row: its name, and a mark at the end. */
function LinkRow({
  option,
  child = false,
  lead,
  onClose,
}: {
  option: NavLinkOption;
  child?: boolean;
  lead?: ReactNode;
  onClose: () => void;
}) {
  const Mark = option.external ? ArrowUpRight : ChevronRight;
  return (
    <PublicNavLink
      option={option}
      onClick={onClose}
      className={
        child
          ? "public-menu-item public-menu-link public-menu-subitem"
          : "public-menu-item public-menu-link"
      }
      activeClassName="public-menu-active"
    >
      {lead}
      <span className="public-menu-label">{option.label}</span>
      <Mark
        size={18}
        strokeWidth={2}
        aria-hidden="true"
        className="public-menu-mark"
        data-external={option.external || undefined}
      />
    </PublicNavLink>
  );
}

/** Who is signed in and the account's actions, or the way to sign in. */
function AccountRows({
  user,
  isLoading,
  logout,
  onClose,
}: Pick<MobileMenuProps, "user" | "isLoading" | "logout" | "onClose">) {
  const [loggingOut, setLoggingOut] = useState(false);
  if (isLoading) {
    return (
      <div className="public-menu-loading" aria-busy="true">
        <Skeleton className="h-6" />
      </div>
    );
  }
  if (!user) {
    return (
      <Link
        to="/login"
        onClick={onClose}
        className="public-menu-item public-menu-login"
      >
        <UserIcon size={18} />
        {m.nav_login_register()}
      </Link>
    );
  }
  return (
    <>
      <div className="public-menu-identity">
        {user.image ? <img src={user.image} alt="" /> : <UserIcon size={16} />}
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
  );
}

/**
 * The rows of the public menu. As the account menu (`mobile` false): who is
 * signed in and the account's actions, or the way to sign in. As the compact
 * navigation: every navigation entry first, a group as its name over its
 * links, always open; then the account; then the Colour Scheme and the
 * language. The panel around the rows, and what the rows look like in it, is
 * the Theme Shell's (mobile-menu.css has 「经典」's look).
 */
export function MobileMenu({
  navOptions,
  onClose,
  user,
  logout,
  mobile,
  isLoading,
  lead,
}: MobileMenuProps) {
  const groupId = useId();
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
        <nav className="public-menu-links" aria-label={m.nav_main_label()}>
          {navOptions.map((option) =>
            isNavGroup(option) ? (
              // Always open: a group is its name over its links.
              <div
                key={option.id}
                role="group"
                aria-labelledby={`${groupId}-${option.id}`}
                className="public-menu-group"
              >
                <p
                  id={`${groupId}-${option.id}`}
                  className="public-menu-group-label"
                >
                  {lead?.(option)}
                  <span className="public-menu-label">{option.label}</span>
                </p>
                <div className="public-menu-group-links">
                  {option.children.map((child) => (
                    <LinkRow
                      key={child.id}
                      option={child}
                      child
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <LinkRow
                key={option.id}
                option={option}
                lead={lead?.(option)}
                onClose={onClose}
              />
            ),
          )}
        </nav>
      )}
      <div className="public-menu-account">
        <AccountRows
          user={user}
          isLoading={isLoading}
          logout={logout}
          onClose={onClose}
        />
      </div>
      {mobile && (
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
      )}
    </>
  );
}
