import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { isAdminWorkspace } from "@/components/admin/content-workspace";
import { NotFound } from "@/components/common/not-found";
import { watchSession } from "@/features/auth/queries";
import { ErrorPage } from "./components/common/error-page";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export function getRouter() {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: "intent",
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <TanstackQuery.Provider {...rqContext}>
          {props.children}
        </TanstackQuery.Provider>
      );
    },
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorPage,
    defaultViewTransition: false,
    // These workspaces manage their own inner scroll areas.
    scrollRestoration: ({ location }) => !isAdminWorkspace(location.pathname),
  });

  // First hydration is not a client navigation. Leaving n=true makes
  // TanStack Router scrollTo(0) after SSR HTML is already on screen, which
  // yanks the page back to the top if the reader scrolled during load.
  router._scroll.n = false;

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  // In the browser, the session query hears of changes from other tabs,
  // focus and the network whether or not the page on screen reads it.
  if (typeof window !== "undefined") watchSession(rqContext.queryClient);

  return router;
}
