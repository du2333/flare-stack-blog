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
      className={`fixed inset-0 z-100 transition-all duration-500 ease-in-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
        onClick={onClose}
      />

      {/* Content Container */}
      <div
        className={`relative h-full w-full flex flex-col p-8 md:p-20 transition-all duration-500 delay-75 ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold tracking-tighter text-foreground">
              [ {blogConfig.name} ]
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent transition-all"
          >
            <X size={24} strokeWidth={1.5} />
          </Button>
        </div>

        {/* Links: Terminal Style */}
        <nav className="flex-1 flex flex-col justify-center space-y-6 md:space-y-8 font-mono">
          {navOptions.map((item, idx) => (
            <Link
              key={item.id}
              to={item.to}
              onClick={onClose}
              className={`group flex items-center gap-4 transition-all duration-500 ${
                isOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-8 opacity-0"
              }`}
              activeProps={{
                className: "!text-foreground",
              }}
              style={{ transitionDelay: isOpen ? `${50 + idx * 50}ms` : "0ms" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-sm md:text-base text-muted-foreground/50 transition-colors ${
                      isActive
                        ? "text-foreground"
                        : "group-hover:text-foreground"
                    }`}
                  >
                    &gt;_
                  </span>
                  <span className="text-3xl md:text-5xl font-bold tracking-tight text-muted-foreground transition-colors group-hover:text-foreground">
                    {item.label}
                    {isActive && (
                      <span className="animate-pulse ml-2 inline-block w-3 h-8 bg-foreground -mb-1 align-middle" />
                    )}
                  </span>
                </>
              )}
            </Link>
          ))}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              onClick={onClose}
              className={`group flex items-center gap-4 transition-all duration-500 ${
                isOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-8 opacity-0"
              }`}
              activeProps={{
                className: "!text-foreground",
              }}
              style={{
                transitionDelay: isOpen
                  ? `${100 + navOptions.length * 75}ms`
                  : "0ms",
              }}
            >
              <span className="text-sm md:text-base text-muted-foreground/50 group-hover:text-foreground transition-colors">
                &gt;_
              </span>
              <span className="text-3xl md:text-5xl font-bold tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                管理
              </span>
            </Link>
          )}
        </nav>

        {/* Footer: User Info / Login */}
        <div
          className={`transition-all duration-500 border-t border-border/40 pt-8 ${
            isOpen
              ? "opacity-100 translate-y-0 delay-500"
              : "opacity-0 translate-y-4"
          }`}
        >
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <UserIcon size={16} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm text-foreground">
                    @{user.name}
                  </span>
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground text-left"
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
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="group flex items-center gap-2 font-mono text-xl md:text-2xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>$ login</span>
              <span className="w-2.5 h-5 bg-foreground opacity-0 group-hover:opacity-100 animate-pulse transition-opacity" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
