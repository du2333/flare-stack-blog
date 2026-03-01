import { Link } from "@tanstack/react-router";
import { BackgroundLayer } from "../components/background-layer";
import type { UserLayoutProps } from "@/features/theme/contract/layouts";

export function UserLayout({
  isAuthenticated,
  navOptions,
  user,
  isSessionLoading,
  logout,
  children,
}: UserLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--cuckoo-page-bg)]">
      {/* Background Layer */}
      <BackgroundLayer />

      {/* Top Navigation Bar */}
      <header className="cuckoo-card mb-6 mx-4">
        <div className="max-w-[var(--cuckoo-max-width)] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="font-bold cuckoo-text-primary hover:cuckoo-primary transition-colors"
            >
              {user?.name || "用户中心"}
            </Link>

            <div className="flex items-center gap-4">
              {/* Navigation Links */}
              <nav className="hidden sm:flex items-center gap-4">
                {navOptions.map((option) => (
                  <Link
                    key={option.id}
                    to={option.to}
                    className="cuckoo-text-secondary hover:cuckoo-primary transition-colors text-sm"
                  >
                    {option.label}
                  </Link>
                ))}
              </nav>

              {/* User Actions */}
              {isAuthenticated && user && !isSessionLoading && (
                <button
                  onClick={logout}
                  className="cuckoo-btn cuckoo-btn-secondary py-2 px-4"
                >
                  退出登录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[var(--cuckoo-max-width)] mx-auto px-4 pb-8">
        {children}
      </main>
    </div>
  );
}
