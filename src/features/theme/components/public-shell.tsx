import { useLocation, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { BackToTop } from "@/components/layout/back-to-top";
import { FloatingActionsProvider } from "@/components/layout/floating-actions";
import { Footer } from "@/components/layout/footer";
import { PageFade } from "@/components/layout/page-fade";
import type { ThemeOptionValues } from "../theme-shell";
import type { Theme } from "../themes";
import { resolvePageKind } from "../utils/page-kind";
import { sidebarCardsFor } from "./sidebar-cards";
import { ThemeRecipeProvider } from "./theme-recipe";

interface PublicShellProps {
  /** The selected Theme, and its options resolved against its defaults. */
  theme: Theme;
  options: ThemeOptionValues;
  children: ReactNode;
  navOptions: Array<NavOption>;
  user?: UserInfo;
  isSessionLoading: boolean;
  logout: () => Promise<void>;
}

/**
 * Decides what the public pages show around their content (the page kind and
 * the sidebar cards) and hands it to the selected Theme's shell to arrange,
 * with the Theme's recipe for the shared content components inside it.
 */
export function PublicShell({
  theme,
  options,
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
  const { shell } = theme;
  const { Shell } = shell;

  return (
    <ThemeRecipeProvider recipe={theme.recipe}>
      <FloatingActionsProvider>
        <Shell
          pageKind={pageKind}
          options={options}
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
