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
        <div className="flex-1 w-full flex items-center justify-center p-4 min-h-[50vh]">
          <div
            className="fuwari-card-base max-w-md w-full p-8 md:p-10 text-center fuwari-onload-animation"
            style={{ animationDelay: "150ms" }}
          >
            <div className="w-16 h-16 bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-8 h-8" strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl font-bold fuwari-text-90 mb-3 transition-colors">
              {m.auth_layout_login_required()}
            </h1>
            <p className="text-(--fuwari-btn-content) mb-8 transition-colors leading-relaxed">
              {m.auth_layout_login_required_desc()}
              <br />
              {m.auth_layout_login_required_desc2()}
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="fuwari-btn-primary rounded-xl w-full py-3 flex items-center justify-center gap-2 font-bold active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4" />
                {m.auth_layout_go_to_login()}
              </Link>
              <Link
                to="/"
                className="fuwari-btn-regular rounded-xl w-full py-3 flex items-center justify-center gap-2 font-medium active:scale-95 transition-all"
              >
                <Home className="w-4 h-4" />
                {m.auth_layout_back_home()}
              </Link>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
