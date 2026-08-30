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
  Settings,
  Tag,
  User,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/common/theme-toggle";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { FileRoutesByTo } from "@/routeTree.gen";

interface NavItem {
  path: keyof FileRoutesByTo;
  icon: React.ElementType;
  label: string;
  exact: boolean;
}

export function SideBar({
  isMobileSidebarOpen,
  closeMobileSidebar,
}: {
  isMobileSidebarOpen: boolean;
  closeMobileSidebar: () => void;
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
      icon: VolumeX,
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
        className={cn(
          "fuwari-card-base overflow-visible z-70 flex flex-col bg-(--fuwari-card-bg)",
          "fixed top-4 bottom-4 left-4 w-[78vw] max-w-xs",
          "transform transition-transform duration-300 ease-in-out",
          "lg:static lg:top-auto lg:bottom-auto lg:left-auto lg:w-64 lg:h-full lg:translate-x-0 lg:shrink-0",
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-[calc(100%+1rem)] lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
          <Link
            to="/admin"
            onClick={closeMobileSidebar}
            className="fuwari-expand-animation rounded-xl flex items-center gap-2 h-12 px-3 min-w-0"
          >
            <Home
              size={22}
              strokeWidth={1.5}
              className="text-(--fuwari-primary) shrink-0"
            />
            <span className="text-(--fuwari-primary) font-bold text-sm truncate">
              {siteConfig.title}
            </span>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden p-2 rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
            aria-label={m.admin_sidebar_close_navigation()}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              activeOptions={{ exact: item.exact, includeSearch: false }}
              className="block"
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    "flex items-center rounded-xl h-11 px-3 gap-3 w-full text-sm font-medium",
                    isActive
                      ? "fuwari-btn-primary justify-start"
                      : "fuwari-text-75 hover:text-(--fuwari-primary)",
                  )}
                >
                  <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-(--fuwari-input-border) px-3 py-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-3 min-w-0 flex-1 px-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-(--fuwari-btn-regular-bg) flex items-center justify-center shrink-0">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={14} className="opacity-50" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm fuwari-text-90 truncate">
                  {user?.name || m.admin_sidebar_admin_fallback()}
                </span>
                <span className="text-xs fuwari-text-50">
                  {user?.role === "admin"
                    ? m.admin_sidebar_role_admin()
                    : m.admin_sidebar_role_user()}
                </span>
              </div>
            </div>

            <Link
              to="/"
              className="w-8 h-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary)"
              title={m.admin_layout_back_to_site()}
            >
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </Link>
            <ThemeToggle className="size-8" />
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-destructive"
              title={m.admin_sidebar_logout()}
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
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
