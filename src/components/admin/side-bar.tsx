import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  ArrowUpRight,
  FileText,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  PanelLeftClose,
  Palette,
  PanelLeftOpen,
  Settings,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-motion";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getAuthClient, useSession } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";
import type { FileRoutesByTo } from "@/routeTree.gen";
import "./side-bar.css";

interface NavItem {
  path: keyof FileRoutesByTo;
  icon: React.ElementType;
  label: string;
  exact: boolean;
}

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { data: session } = useSession();
  const user = session?.user;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  // The drawer is the phone layout; wider screens lay the sidebar out in place.
  const desktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => {
    if (desktop && isMobileSidebarOpen) closeMobileSidebar();
  }, [desktop, isMobileSidebarOpen, closeMobileSidebar]);

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

  const navItems = [
    {
      path: "/admin",
      icon: LayoutDashboard,
      label: m.admin_sidebar_dashboard(),
      exact: true,
    },
    {
      path: "/admin/posts",
      icon: FileText,
      label: m.admin_sidebar_posts(),
      exact: false,
    },
    {
      path: "/admin/media",
      icon: ImageIcon,
      label: m.admin_sidebar_media(),
      exact: false,
    },
    {
      path: "/admin/friend-links",
      icon: Link2,
      label: m.admin_sidebar_friend_links(),
      exact: false,
    },
    {
      path: "/admin/personalize",
      icon: Palette,
      label: m.admin_sidebar_personalize(),
      exact: false,
    },
    {
      path: "/admin/settings",
      icon: Settings,
      label: m.admin_layout_settings(),
      exact: false,
    },
  ] satisfies Array<NavItem>;

  return (
    <>
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
        className={`admin-sidebar fuwari-card-base ${collapsed ? "is-collapsed" : ""}`}
      >
        <header className="admin-sidebar-header">
          <Link
            to="/admin"
            title={siteConfig.title}
            aria-label={siteConfig.title}
            onClick={closeMobileSidebar}
            className="admin-sidebar-brand admin-sidebar-row"
          >
            <span className="admin-sidebar-icon">
              <Home size={22} strokeWidth={1.5} />
            </span>
            <span className="admin-sidebar-label">{siteConfig.title}</span>
          </Link>
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
              <PanelLeftOpen size={17} strokeWidth={1.5} />
            ) : (
              <PanelLeftClose size={17} strokeWidth={1.5} />
            )}
          </button>
        </header>

        <nav className="admin-sidebar-nav custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              activeOptions={{ exact: item.exact, includeSearch: false }}
              title={item.label}
              aria-label={item.label}
            >
              {({ isActive }) => (
                <div
                  className={`admin-sidebar-row admin-sidebar-item ${isActive ? "is-active" : ""}`}
                >
                  <span className="admin-sidebar-icon">
                    <item.icon size={19} strokeWidth={1.5} />
                  </span>
                  <span className="admin-sidebar-label">{item.label}</span>
                </div>
              )}
            </Link>
          ))}
        </nav>

        <footer className="admin-sidebar-footer">
          <div
            className="admin-sidebar-row admin-sidebar-user"
            title={user?.name || m.admin_sidebar_admin_fallback()}
          >
            <span className="admin-sidebar-icon">
              <span className="admin-sidebar-avatar">
                {user?.image ? (
                  <img src={user.image} alt={user.name} />
                ) : (
                  <User size={16} strokeWidth={1.5} />
                )}
              </span>
            </span>
            <div className="admin-sidebar-label">
              <p className="truncate text-sm font-medium fuwari-text-90">
                {user?.name || m.admin_sidebar_admin_fallback()}
              </p>
              <p className="mt-0.5 text-xs fuwari-text-50">
                {user?.role === "admin"
                  ? m.admin_sidebar_role_admin()
                  : m.admin_sidebar_role_user()}
              </p>
            </div>
          </div>
          <div className="admin-sidebar-actions">
            <Link
              to="/"
              className="admin-sidebar-row admin-sidebar-action"
              title={m.admin_layout_back_to_site()}
              aria-label={m.admin_layout_back_to_site()}
            >
              <span className="admin-sidebar-icon">
                <ArrowUpRight size={18} strokeWidth={1.5} />
              </span>
              <span className="admin-sidebar-label">
                {m.admin_layout_back_to_site()}
              </span>
            </Link>
            <ColourSchemeToggle
              className="admin-sidebar-row admin-sidebar-action admin-sidebar-colour-scheme"
              label={
                <span className="admin-sidebar-label">
                  {m.admin_sidebar_colour_scheme()}
                </span>
              }
            />
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="admin-sidebar-row admin-sidebar-action admin-sidebar-logout"
              title={m.admin_sidebar_logout()}
              aria-label={m.admin_sidebar_logout()}
            >
              <span className="admin-sidebar-icon">
                <LogOut size={18} strokeWidth={1.5} />
              </span>
              <span className="admin-sidebar-label">
                {m.admin_sidebar_logout()}
              </span>
            </button>
          </div>
        </footer>
      </Sheet>

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
