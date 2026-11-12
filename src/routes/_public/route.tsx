import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Toaster } from "@/components/layout/toaster";
import { NameGate } from "@/features/auth/components/name-gate";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useSession } from "@/lib/auth/auth-client";
import { CACHE_CONTROL } from "@/lib/constants";
import { clientEnv } from "@/lib/env/client.env";
import { isExternalNavHref } from "@/features/config/utils/nav-links";
import { useIsAdmin } from "@/features/moments/hooks/use-is-admin";
import { momentsExistQuery } from "@/features/moments/queries";
import { tagsQueryOptions } from "@/features/tags/queries";
import { PublicShell } from "@/features/theme/components/public-shell";
import { ThemePreviewBar } from "@/features/theme/components/theme-preview-bar";
import { activeTheme } from "@/features/theme/theme-preview";
import { useThemePreviewMessages } from "@/features/theme/utils/theme-preview-live";
import {
  carryThemePreview,
  searchHasThemePreview,
  withoutThemePreview,
} from "@/features/theme/utils/theme-preview-params";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  // While previewing, in-site navigation keeps the preview; a reload sends
  // the parameters to the server, which renders it again.
  search: {
    middlewares: [
      ({ search, next }) =>
        carryThemePreview(search, next(search) as Record<string, unknown>),
    ],
  },
  // The navigation shows the Moments entry only once a Moment exists, so the
  // answer is in the server-rendered page. A failed lookup only leaves the
  // entry out.
  //
  // So are the categories and the tags, which the sidebar cards show on
  // every page that has cards: a card is there from the first paint, and a
  // site without any never shows one. Left to load while the page streams,
  // a placeholder stood in for each and gave way, and on a site without
  // categories or tags what followed it jumped. A failed lookup leaves the
  // card to ask again by itself.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(momentsExistQuery),
      context.queryClient.prefetchQuery(categoriesQueryOptions),
      context.queryClient.prefetchQuery(tagsQueryOptions),
    ]);
  },
  headers: () => {
    return CACHE_CONTROL.html;
  },
  head: ({ match }) => {
    const env = clientEnv();
    // Only the selected Theme's stylesheet, so a visitor never downloads the
    // others; in the server-rendered head, so the first paint has it.
    const { theme } = activeTheme(
      match.context.siteConfig,
      match.context.themePreview,
    );
    return {
      links: [{ rel: "stylesheet", href: theme.stylesheet }],
      scripts: env.VITE_UMAMI_WEBSITE_ID
        ? [
            {
              src: "/stats.js",
              defer: true,
              "data-website-id": env.VITE_UMAMI_WEBSITE_ID,
            },
          ]
        : [],
    };
  },
});

function PublicLayout() {
  const navigate = useNavigate();
  const { siteConfig, themePreview } = useRouteContext({ from: "__root__" });
  const { theme, options } = activeTheme(siteConfig, themePreview);
  // An embedding Admin page moves the banner focus and the hue in place.
  useThemePreviewMessages(Boolean(themePreview));
  const hasPreviewParams = useLocation({
    select: (location) => searchHasThemePreview(location.search),
  });
  const exitPreview = useCallback(
    () =>
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) =>
          withoutThemePreview(previous),
        replace: true,
      }),
    [navigate],
  );
  const { data: session, isPending: isSessionPending } = useSession();
  const { logout } = useLogout();
  const isAdmin = useIsAdmin();
  const { data: moments } = useQuery(momentsExistQuery);
  // The Admin always has the entry, to post the first Moment.
  const showMoments = moments?.exists === true || isAdmin;

  const navOptions = [
    { id: "home", label: m.nav_home(), href: "/", external: false },
    { id: "posts", label: m.nav_posts(), href: "/posts", external: false },
    ...(showMoments
      ? [
          {
            id: "moments",
            label: m.moments_title(),
            href: "/moments",
            external: false,
          },
        ]
      : []),
    {
      id: "friend-links",
      label: m.nav_friend_links(),
      href: "/friend-links",
      external: false,
    },
    ...siteConfig.navLinks.map((link, index) => ({
      id: `custom-${index}`,
      label: link.label,
      href: link.href,
      external: isExternalNavHref(link.href),
    })),
  ];

  // Someone who may not preview keeps the plain address, so the parameters
  // do not follow them around the site.
  useEffect(() => {
    if (hasPreviewParams && !themePreview) exitPreview();
  }, [hasPreviewParams, themePreview, exitPreview]);

  // Global shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        void navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <PublicShell
        theme={theme}
        options={options}
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </PublicShell>
      {themePreview ? (
        <ThemePreviewBar themeName={theme.name()} onExit={exitPreview} />
      ) : null}
      <NameGate user={session?.user} logout={logout} />
      <Toaster />
    </>
  );
}
