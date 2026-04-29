import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  isOpen: boolean;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
}

/**
 * Enhanced Mobile Menu — Amazing Theme
 *
 * Sliding panel with elastic spring animation, staggered nav item entrance,
 * frosted glass backdrop, and smooth exit transitions.
 */
export function MobileMenu({
  navOptions,
  isOpen,
  onClose,
  user,
  logout,
}: MobileMenuProps) {
  return (
    <>
      {/* Backdrop with blur */}
      <div
        className={cn(
          "fixed inset-0 z-49 bg-black/25 backdrop-blur-md transition-all duration-400",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Floating Menu Panel with spring entrance */}
      <div
        className={cn(
          "fixed top-20 right-4 z-50 w-72 origin-top-right transition-all duration-500 ease-out transform",
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-90 opacity-0 -translate-y-4 pointer-events-none",
        )}
        style={{
          transitionTimingFunction: isOpen
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="amazing-navbar-glass rounded-2xl p-2 flex flex-col gap-1 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Navigation Items with staggered entrance */}
          <nav className="flex flex-col">
            {navOptions.map((item, index) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg) hover:text-(--fuwari-primary) active:scale-[0.98] hover:translate-x-1",
                  isOpen && "amazing-animate-in",
                )}
                style={{
                  animationDelay: isOpen ? `${index * 60 + 100}ms` : "0ms",
                }}
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
                className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg) hover:text-(--fuwari-primary) active:scale-[0.98] hover:translate-x-1"
              >
                <Settings className="w-4 h-4 mr-3" />
                {m.profile_admin_dashboard_fuwari()}
              </Link>
            )}
          </nav>

          {/* Divider with gradient */}
          <div className="h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent my-1 mx-3" />

          {/* User Section */}
          {user ? (
            <div className="px-2 pb-1">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-(--fuwari-btn-regular-bg) shrink-0 ring-2 ring-(--fuwari-primary)/20">
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
                    className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) truncate transition-colors"
                  >
                    {m.profile_title()}
                  </Link>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all hover:scale-110 active:scale-95"
                  aria-label={m.profile_logout_fuwari()}
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
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) hover:bg-(--fuwari-btn-regular-bg-hover) active:bg-(--fuwari-btn-regular-bg-active) hover:shadow-md active:scale-95"
              >
                <UserIcon size={16} className="mr-2" strokeWidth={1.5} />
                {m.nav_login_register()}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
