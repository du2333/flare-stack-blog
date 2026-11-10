import { Link, useLocation } from "@tanstack/react-router";
import { Home, LogIn } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { UserLayoutProps } from "@/components/layout/layout-props";
import { m } from "@/paraglide/messages";

export function UserLayout({ isAuthenticated, children }: UserLayoutProps) {
  const location = useLocation();
  if (isAuthenticated) return children;

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 min-h-[50vh]">
      <div
        className="fuwari-card-base fuwari-card-standalone max-w-md w-full py-8 px-(--theme-standalone-pad-x-narrow,--spacing(8)) sm:px-8 md:p-10 text-center fuwari-onload-animation"
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 150ms)" }}
      >
        <div className="w-16 h-16 bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-8 h-8" strokeWidth={1.5} />
        </div>

        <h1 className="fuwari-heading text-2xl font-bold fuwari-text-90 mb-3 transition-colors">
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
            search={{ redirectTo: location.href }}
            className={buttonClass({
              variant: "primary",
              size: "lg",
              className: "w-full",
            })}
          >
            <LogIn className="w-4 h-4" />
            {m.auth_layout_go_to_login()}
          </Link>
          <Link
            to="/"
            className={buttonClass({ size: "lg", className: "w-full" })}
          >
            <Home className="w-4 h-4" />
            {m.auth_layout_back_home()}
          </Link>
        </div>
      </div>
    </div>
  );
}
