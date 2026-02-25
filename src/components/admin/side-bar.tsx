import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  Guitar,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageSquare,
  Settings,
  Tag,
  Users,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileRoutesByTo } from "@/routeTree.gen";
import { ThemeToggle } from "@/components/common/theme-toggle";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { authClient } from "@/lib/auth/auth.client";
import { AUTH_KEYS } from "@/features/auth/queries";
import { cn } from "@/lib/utils";
import { blogConfig } from "@/blog.config";

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

  // ── 侧边栏滑动选中指示器 ──
  const navContainerRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [navIndicator, setNavIndicator] = useState<{ top: number; height: number } | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const updateNavIndicator = useCallback(() => {
    const container = navContainerRef.current;
    if (!container) return;
    const activeItem = navItems.find((item) =>
      item.exact ? pathname === item.path : pathname.startsWith(item.path)
    );
    if (!activeItem) {
      setNavIndicator(null);
      return;
    }
    const el = navItemRefs.current.get(activeItem.path);
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setNavIndicator({
      top: elRect.top - containerRect.top,
      height: elRect.height,
    });
  }, [pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateNavIndicator covers deps
  useLayoutEffect(() => {
    updateNavIndicator();
  }, [updateNavIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateNavIndicator);
    return () => window.removeEventListener("resize", updateNavIndicator);
  }, [updateNavIndicator]);

  const setNavItemRef = useCallback((path: string) => (el: HTMLDivElement | null) => {
    if (el) navItemRefs.current.set(path, el);
    else navItemRefs.current.delete(path);
  }, []);

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    const { error } = await authClient.signOut();
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);

    if (error) {
      toast.error("注销失败", {
        description: "请重试。",
      });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    toast.success("已退出登录");
    navigate({ to: "/login" });
  };

  const navItems = [
    {
      path: "/admin",
      icon: LayoutDashboard,
      label: "概览",
      exact: true,
    },
    {
      path: "/admin/posts",
      icon: FileText,
      label: "文章管理",
      exact: false,
    },
    {
      path: "/admin/tags",
      icon: Tag,
      label: "标签管理",
      exact: false,
    },
    {
      path: "/admin/media",
      icon: ImageIcon,
      label: "媒体库",
      exact: false,
    },
    {
      path: "/admin/guitar-tabs",
      icon: Guitar,
      label: "吉他谱审核",
      exact: false,
    },
    {
      path: "/admin/comments",
      icon: MessageSquare,
      label: "评论管理",
      exact: false,
    },
    {
      path: "/admin/friend-links",
      icon: Link2,
      label: "友链管理",
      exact: false,
    },
    {
      path: "/admin/users",
      icon: Users,
      label: "用户管理",
      exact: false,
    },
    {
      path: "/admin/settings",
      icon: Settings,
      label: "系统设置",
      exact: false,
    },
  ] satisfies Array<NavItem>;

  return (
    <>
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-60 md:hidden backdrop-blur-sm animate-in fade-in duration-500"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-70 w-72 md:w-64 border-r border-border/30 flex flex-col bg-background transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          isMobileSidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0",
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
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navContainerRef} className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar relative">
          {/* 滑动选中指示器 — 黑色背景块 */}
          {navIndicator && (
            <div
              className="absolute left-4 right-4 bg-foreground pointer-events-none z-0"
              style={{
                top: navIndicator.top,
                height: navIndicator.height,
                transition: "top 500ms cubic-bezier(0.34, 1.56, 0.64, 1), height 400ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          )}
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
                  ref={setNavItemRef(item.path)}
                  className={cn(
                    "relative z-[1] flex items-center gap-4 px-4 py-3 text-[11px] font-mono transition-colors duration-300 border border-transparent",
                    isActive
                      ? "text-background"
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
              THEME_MODE
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
                  {user?.name || "管理员"}
                </span>
                <span className="text-[8px] text-muted-foreground font-mono">
                  {user?.role === "admin" ? "ADMINISTRATOR" : "USER"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOutClick}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/30"
              title="退出登录"
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
        title="确认退出"
        message="您确定要结束当前管理会话并注销吗？"
        confirmLabel="确认退出"
        isLoading={isLoggingOut}
      />
    </>
  );
}
