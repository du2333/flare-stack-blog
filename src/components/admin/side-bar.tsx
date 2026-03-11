import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageSquare,
  Tag,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { blogConfig } from "@/blog.config";
import { ThemeToggle } from "@/components/common/theme-toggle";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { AUTH_KEYS } from "@/features/auth/queries";
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
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

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

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

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
      path: "/admin/comments",
      icon: MessageSquare,
      label: m.admin_sidebar_comments(),
      exact: false,
    },
    {
      path: "/admin/friend-links",
      icon: Link2,
      label: m.admin_sidebar_friend_links(),
      exact: false,
    },
  ] satisfies Array<NavItem>;

  return (
    <>
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-60 lg:hidden backdrop-blur-sm animate-in fade-in duration-500"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-70 w-72 lg:w-64 border-r border-border/30 flex flex-col bg-background transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isMobileSidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-border/30">
          <Link to="/admin" className="flex items-center gap-3 group">
            <span className="font-serif font-black text-xl tracking-tighter group-hover:opacity-80 transition-opacity">
              [ {blogConfig.name} ]
            </span>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label={m.admin_sidebar_close_navigation()}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              activeOptions={{ exact: item.exact, includeSearch: false }}
              className="group flex flex-col"
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 text-[11px] font-mono transition-all border border-transparent",
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "text-muted-foreground hover:text-foreground hover:border-border/30",
                  )}
                >
                  <item.icon size={14} strokeWidth={1.5} className="shrink-0" />
                  <div className="flex flex-col">
                    <span className="uppercase tracking-widest font-medium leading-none">
                      {isActive ? `> ${item.label}` : item.label}
                    </span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-6 border-t border-border/30 shrink-0 space-y-6">
          {/* Theme Toggle Area */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {m.admin_sidebar_theme_mode()}
            </span>
            <ThemeToggle className="size-8" />
          </div>

          {/* User Info */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 border border-border/30 flex items-center justify-center bg-muted/20">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <User size={14} className="opacity-50" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider truncate max-w-25">
                  {user?.name || m.admin_sidebar_admin_fallback()}
                </span>
                <span className="text-[8px] text-muted-foreground font-mono">
                  {user?.role === "admin"
                    ? m.admin_sidebar_role_admin()
                    : m.admin_sidebar_role_user()}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOutClick}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/30"
              title={m.admin_sidebar_logout()}
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
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
