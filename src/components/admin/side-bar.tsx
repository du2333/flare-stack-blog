import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Ban,
  FileText,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Tag,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/common/theme-toggle";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";
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
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    const { error } = await authClient.signOut();
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
    navigate({ to: "/login" });
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
      path: "/admin/tags",
      icon: Tag,
      label: m.admin_sidebar_tags(),
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
      path: "/admin/muted-users",
      icon: Ban,
      label: m.admin_sidebar_muted_users(),
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
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-60 lg:hidden backdrop-blur-sm"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        id="admin-sidebar"
        aria-label={m.admin_layout_title()}
        className={`admin-sidebar fuwari-card-base ${collapsed ? "is-collapsed" : ""} ${isMobileSidebarOpen ? "is-open" : ""}`}
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
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="admin-sidebar-mobile-close"
            aria-label={m.admin_sidebar_close_navigation()}
          >
            <X size={18} />
          </button>
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
            <ThemeToggle
              className="admin-sidebar-row admin-sidebar-action admin-sidebar-theme"
              label={
                <span className="admin-sidebar-label">
                  {m.admin_sidebar_appearance()}
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
      </aside>

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
