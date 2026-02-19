import { Link } from "@tanstack/react-router";
import type { UserLayoutProps } from "@/features/theme/contract/layouts";

export function UserLayout({ isAuthenticated, children }: UserLayoutProps) {
  return (
    <div className="min-h-screen font-sans relative antialiased">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      {isAuthenticated ? (
        <main className="relative z-10">{children}</main>
      ) : (
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="max-w-md w-full space-y-8 text-center">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
              请先登录
            </h1>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              你需要登录后才能访问此页面。
            </p>
            <div className="flex items-center justify-center gap-6 pt-4">
              <Link
                to="/login"
                className="text-sm font-mono text-foreground hover:text-foreground/80 transition-colors"
              >
                [ 前往登录 ]
              </Link>
              <Link
                to="/"
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
