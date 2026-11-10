import { useLocation, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { BackToTop } from "@/components/layout/back-to-top";
import { FloatingActionsProvider } from "@/components/layout/floating-actions";
import { Footer } from "@/components/layout/footer";
import { PageFade } from "@/components/layout/page-fade";
import { classicShell } from "../shells/classic/classic-shell";
import { DEFAULT_THEME_RECIPE } from "../theme-recipe";
import { resolvePageKind } from "../utils/page-kind";
import { sidebarCardsFor } from "./sidebar-cards";
import { ThemeRecipeProvider } from "./theme-recipe";

interface PublicShellProps {
  children: ReactNode;
  navOptions: Array<NavOption>;
  user?: UserInfo;
  isSessionLoading: boolean;
  logout: () => Promise<void>;
}

/**
 * Decides what the public pages show around their content (the page kind and
 * the sidebar cards) and hands it to the Theme Shell to arrange.
 */
export function PublicShell({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicShellProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isAuthRoute = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId.includes("/_auth")),
  });
  const hasRouteError = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) => match.status === "error" || match.status === "notFound",
      ),
  });
  const pageKind = resolvePageKind({ pathname, isAuthRoute, hasRouteError });
  const shell = classicShell;
  const { Shell } = shell;

  return (
    <ThemeRecipeProvider recipe={DEFAULT_THEME_RECIPE}>
      <FloatingActionsProvider>
        <Shell
          pageKind={pageKind}
          navOptions={navOptions}
          sidebarCards={sidebarCardsFor(pageKind, shell)}
          user={user}
          isSessionLoading={isSessionLoading}
          logout={logout}
          footer={<Footer navOptions={navOptions} />}
          floatingActions={<BackToTop />}
        >
          <PageFade includeSearch={pathname !== "/search"}>{children}</PageFade>
        </Shell>
      </FloatingActionsProvider>
    </ThemeRecipeProvider>
  );
}
