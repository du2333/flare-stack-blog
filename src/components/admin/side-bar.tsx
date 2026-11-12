import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronsUpDown,
  Globe,
  LogOut,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { Badge } from "@/components/ui/badge";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-motion";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getAuthClient, useSession } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";
import { useAdminCounts } from "./admin-counts";
import { ADMIN_NAV, currentNavItem, type AdminNavItem } from "./admin-nav";
import "./side-bar.css";

export function SideBar({
  isMobileSidebarOpen,
  closeMobileSidebar,
  collapsed,
  onToggleCollapse,
}: {
  isMobileSidebarOpen: boolean;
  closeMobileSidebar: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = currentNavItem(pathname);
  const counts = useAdminCounts();
  const closeRef = useRef<HTMLButtonElement>(null);

  // The drawer is the phone layout; wider screens lay the sidebar out in place.
  const desktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => {
    if (desktop && isMobileSidebarOpen) closeMobileSidebar();
  }, [desktop, isMobileSidebarOpen, closeMobileSidebar]);
  // The rail is a desktop state; the drawer always shows the labels.
  const rail = collapsed && desktop;

  return (
    <Sheet
      open={isMobileSidebarOpen}
      onClose={closeMobileSidebar}
      side="left"
      as="aside"
      keepMounted
      initialFocus={() => closeRef.current}
      backdropClassName="lg:hidden"
      id="admin-sidebar"
      aria-label={m.admin_layout_title()}
      className={`admin-sidebar ${collapsed ? "is-collapsed" : ""}`}
    >
      <header className="admin-sidebar-header">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          title={m.admin_sidebar_open_site()}
          aria-label={m.admin_sidebar_site_link({ site: siteConfig.title })}
          className="admin-sidebar-row admin-sidebar-site"
        >
          <span className="admin-sidebar-icon">
            <Globe size={18} strokeWidth={1.6} />
          </span>
          <span className="admin-sidebar-label">{siteConfig.title}</span>
          <ArrowUpRight
            size={14}
            strokeWidth={1.6}
            aria-hidden
            className="admin-sidebar-site-arrow"
          />
        </a>
        <IconButton
          ref={closeRef}
          size="md"
          onClick={closeMobileSidebar}
          className="admin-sidebar-mobile-close"
          label={m.admin_sidebar_close_navigation()}
        >
          <X size={18} />
        </IconButton>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="admin-sidebar-toggle"
          aria-controls="admin-sidebar"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? m.admin_sidebar_expand() : m.admin_sidebar_collapse()
          }
          title={
            collapsed ? m.admin_sidebar_expand() : m.admin_sidebar_collapse()
          }
        >
          {collapsed ? (
            <PanelLeftOpen size={15} strokeWidth={1.6} />
          ) : (
            <PanelLeftClose size={15} strokeWidth={1.6} />
          )}
        </button>
      </header>

      <nav
        className="admin-sidebar-nav custom-scrollbar"
        aria-label={m.admin_layout_title()}
      >
        {ADMIN_NAV.map((group) => {
          const label = group.label?.();
          return (
            <div
              key={group.id}
              className="admin-sidebar-group"
              role={label ? "group" : undefined}
              aria-label={label}
            >
              {label ? (
                <p className="admin-sidebar-group-label" aria-hidden="true">
                  <span>{label}</span>
                </p>
              ) : null}
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  current={current?.id === item.id}
                  count={item.count ? counts[item.count] : 0}
                  rail={rail}
                  onNavigate={closeMobileSidebar}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <footer className="admin-sidebar-footer">
        <AccountMenu rail={rail} />
      </footer>
    </Sheet>
  );
}

function pendingLabel(item: AdminNavItem, count: number) {
  if (count <= 0) return undefined;
  return item.count === "comments"
    ? m.admin_sidebar_comments_pending({ count })
    : m.admin_sidebar_friend_links_pending({ count });
}

function NavLink({
  item,
  current,
  count,
  rail,
  onNavigate,
}: {
  item: AdminNavItem;
  current: boolean;
  count: number;
  rail: boolean;
  onNavigate: () => void;
}) {
  const label = item.label();
  const pending = pendingLabel(item, count);
  const name = pending
    ? m.admin_sidebar_item_pending({ label, pending })
    : label;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      aria-label={name}
      title={rail ? name : undefined}
      className={`admin-sidebar-row admin-sidebar-item ${current ? "is-active" : ""}`}
    >
      <span className="admin-sidebar-icon">
        <item.icon size={18} strokeWidth={1.6} />
        {pending ? <i className="admin-sidebar-dot" aria-hidden /> : null}
      </span>
      <span className="admin-sidebar-label">{label}</span>
      {pending ? (
        <Badge size="sm" className="admin-sidebar-count" aria-hidden>
          {count > 99 ? "99+" : count}
        </Badge>
      ) : null}
    </Link>
  );
}

const SCHEMES = [
  { value: "light", icon: Sun, label: () => m.colour_scheme_light() },
  { value: "dark", icon: Moon, label: () => m.colour_scheme_dark() },
  { value: "system", icon: Monitor, label: () => m.colour_scheme_system() },
] as const;

/** The one row at the foot: who is signed in, and a menu of what to do next. */
function AccountMenu({ rail }: { rail: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { colourSchemePreference, setColourScheme } = useColourScheme();
  const user = session?.user;
  const name = user?.name || m.admin_sidebar_admin_fallback();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    const { error } = await getAuthClient().signOut();
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);

    if (error) {
      toast.error(m.admin_sidebar_logout_failed(), {
        description: m.admin_sidebar_logout_failed_desc(),
      });
      return;
    }

    resetAuthBoundQueries(queryClient);

    toast.success(m.admin_sidebar_logout_success());
    void navigate({ to: "/login" });
  };

  return (
    <>
      <Menu
        label={m.admin_sidebar_account_menu()}
        triggerTitle={rail ? name : undefined}
        placement="top-start"
        triggerClassName="admin-sidebar-row admin-sidebar-account"
        trigger={
          <>
            <span className="admin-sidebar-icon">
              <span className="admin-sidebar-avatar">
                {user?.image ? (
                  <img src={user.image} alt="" />
                ) : (
                  <User size={14} strokeWidth={1.6} />
                )}
              </span>
            </span>
            <span className="admin-sidebar-label">{name}</span>
            <ChevronsUpDown
              size={14}
              strokeWidth={1.6}
              aria-hidden
              className="admin-sidebar-account-chevron"
            />
          </>
        }
      >
        <MenuItem onSelect={() => void navigate({ to: "/" })}>
          <ArrowUpRight size={15} aria-hidden className="shrink-0" />
          <span className="flex-1">{m.admin_layout_back_to_site()}</span>
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>{m.admin_sidebar_colour_scheme()}</MenuLabel>
        {SCHEMES.map((scheme) => (
          <MenuItem
            key={scheme.value}
            role="menuitemradio"
            checked={colourSchemePreference === scheme.value}
            onSelect={() => setColourScheme(scheme.value)}
          >
            <scheme.icon size={15} aria-hidden className="shrink-0" />
            <span className="flex-1">{scheme.label()}</span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem danger onSelect={() => setShowLogoutConfirm(true)}>
          <LogOut size={15} aria-hidden className="shrink-0" />
          <span className="flex-1">{m.admin_sidebar_logout()}</span>
        </MenuItem>
      </Menu>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmSignOut}
        title={m.admin_sidebar_logout_title()}
        message={m.admin_sidebar_logout_message()}
        confirmLabel={m.admin_sidebar_logout_confirm()}
        isLoading={isLoggingOut}
      />
    </>
  );
}
