import { Link } from "@tanstack/react-router";
import { LogOut, UserIcon, X } from "lucide-react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/blog.config";

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
    <div
      className={`fixed inset-0 z-[100] transition-all duration-500 ease-in-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-[var(--fuwari-page-bg)]/95 backdrop-blur-2xl"
        onClick={onClose}
      />

      <div
        className={`relative h-full w-full flex flex-col p-8 md:p-20 transition-all duration-500 delay-75 ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-serif text-2xl font-bold tracking-tighter fuwari-text-90">
            [ {blogConfig.name} ]
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-12 h-12 rounded-full fuwari-text-50 hover:fuwari-text-90 hover:bg-transparent"
          >
            <X size={24} strokeWidth={1.5} />
          </Button>
        </div>

        <nav className="flex-1 flex flex-col justify-center space-y-6 md:space-y-8 font-mono">
          {navOptions.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              onClick={onClose}
              className="group flex items-center gap-4 fuwari-text-50 hover:text-[var(--fuwari-primary)] transition-colors"
              activeProps={{
                className: "!fuwari-text-90",
              }}
            >
              <span className="text-sm md:text-base">&gt;_</span>
              <span className="text-3xl md:text-5xl font-bold tracking-tight">
                {item.label}
              </span>
            </Link>
          ))}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              onClick={onClose}
              className="group flex items-center gap-4 fuwari-text-50 hover:text-[var(--fuwari-primary)] transition-colors"
            >
              <span className="text-sm md:text-base">&gt;_</span>
              <span className="text-3xl md:text-5xl font-bold tracking-tight">
                管理
              </span>
            </Link>
          )}
        </nav>

        <div className="border-t border-black/10 dark:border-white/10 pt-8">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--fuwari-btn-regular-bg)]">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <UserIcon size={16} className="fuwari-text-50" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm fuwari-text-90">
                    @{user.name}
                  </span>
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className="text-[10px] uppercase tracking-widest fuwari-text-50 hover:text-[var(--fuwari-primary)]"
                  >
                    个人资料
                  </Link>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="fuwari-text-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="group flex items-center gap-2 font-mono text-xl md:text-2xl fuwari-text-50 hover:text-[var(--fuwari-primary)] transition-colors"
            >
              <span>$ login</span>
              <span className="w-2.5 h-5 bg-current opacity-0 group-hover:opacity-100 animate-pulse transition-opacity" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
