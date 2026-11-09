import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicLayout as SitePublicLayout } from "@/components/layout/public-layout";
import { Toaster } from "@/components/layout/toaster";
import { NameGate } from "@/features/auth/components/name-gate";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useSession } from "@/lib/auth/auth-client";
import { CACHE_CONTROL } from "@/lib/constants";
import { clientEnv } from "@/lib/env/client.env";
import { isExternalNavHref } from "@/features/config/utils/nav-links";
import { useIsAdmin } from "@/features/moments/hooks/use-is-admin";
import { momentsExistQuery } from "@/features/moments/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  // The navigation shows the Moments entry only once a Moment exists, so the
  // answer is in the server-rendered page. A failed lookup only leaves the
  // entry out.
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(momentsExistQuery);
  },
  headers: () => {
    return CACHE_CONTROL.html;
  },
  head: () => {
    const env = clientEnv();
    return {
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
  const { siteConfig } = useRouteContext({ from: "__root__" });
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
      <SitePublicLayout
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </SitePublicLayout>
      <NameGate user={session?.user} logout={logout} />
      <Toaster />
    </>
  );
}
