import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  isOpen: boolean;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
}

export function MobileMenu({
  navOptions,
  isOpen,
  onClose,
  user,
  logout,
}: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-49 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Floating Menu Panel */}
      <div
        className={cn(
          "fixed top-20 right-4 z-50 w-64 origin-top-right transition-all duration-300 ease-out transform",
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 -translate-y-2 pointer-events-none",
        )}
      >
        <div className="fuwari-card-base p-2 flex flex-col gap-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Navigation Items */}
          <nav className="flex flex-col">
            {navOptions.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={onClose}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg) hover:text-(--fuwari-primary) active:scale-[0.98]"
                activeProps={{
                  className:
                    "!bg-[var(--fuwari-btn-regular-bg)] !text-[var(--fuwari-primary)]",
                }}
              >
                {item.label}
              </Link>
            ))}

            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg) hover:text-(--fuwari-primary) active:scale-[0.98]"
              >
                <Settings className="w-4 h-4 mr-3" />
                管理后台
              </Link>
            )}
          </nav>

          {/* Divider */}
          <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-2" />

          {/* User Section */}
          {user ? (
            <div className="px-2 pb-1">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-(--fuwari-btn-regular-bg) shrink-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <UserIcon size={14} className="fuwari-text-50" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate fuwari-text-90">
                    {user.name}
                  </span>
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) truncate"
                  >
                    查看资料
                  </Link>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-red-500 hover:text-red-600 transition-colors"
                  aria-label="退出登录"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) hover:bg-(--fuwari-btn-regular-bg-hover) active:bg-(--fuwari-btn-regular-bg-active)"
              >
                <UserIcon size={16} className="mr-2" strokeWidth={1.5} />
                登录 / 注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
