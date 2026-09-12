import { Link } from "@tanstack/react-router";
import { Home, LogIn } from "lucide-react";
import type { UserLayoutProps } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";
import { PublicLayout } from "./public-layout";

export function UserLayout({
  isAuthenticated,
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: UserLayoutProps) {
  return (
    <PublicLayout
      navOptions={navOptions}
      user={user}
      isSessionLoading={isSessionLoading}
      logout={logout}
    >
      {isAuthenticated ? (
        children
      ) : (
        <div className="cuckoo-onload-animation flex min-h-[50vh] w-full flex-1 items-center justify-center p-4">
          <div className="cuckoo-card-base w-full max-w-md p-8 text-center shadow-lg md:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-(--cuckoo-btn-regular-bg) text-(--cuckoo-accent)">
              <LogIn className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h1 className="cuckoo-text-90 mb-3 text-2xl font-bold">
              {m.auth_layout_login_required()}
            </h1>
            <p className="cuckoo-text-50 mb-8 leading-relaxed">
              {m.auth_layout_login_required_desc()}
              <br />
              {m.auth_layout_login_required_desc2()}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="cuckoo-btn-primary w-full gap-2 py-3 text-sm font-bold active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                {m.auth_layout_go_to_login()}
              </Link>
              <Link
                to="/"
                className="cuckoo-btn-regular w-full gap-2 py-3 text-sm font-medium active:scale-95"
              >
                <Home className="h-4 w-4" />
                {m.auth_layout_back_home()}
              </Link>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
