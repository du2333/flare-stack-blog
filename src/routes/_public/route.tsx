import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import theme from "@theme";
import { useEffect } from "react";
import { toast } from "sonner";
import { AUTH_KEYS } from "@/features/auth/queries";
import { isFeatureEnabled } from "@/features/config/features";
import { getThemePreloadImages } from "@/features/theme/site-config.helpers";
import { authClient } from "@/lib/auth/auth.client";
import { getLogoutAuthErrorMessage } from "@/lib/auth/auth-errors";
import { CACHE_CONTROL } from "@/lib/constants";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public")({
  loader: ({ context }) => ({
    preloadImages: getThemePreloadImages(context.siteConfig),
  }),
  component: PublicLayout,
  headers: () => {
    return CACHE_CONTROL.public;
  },
  head: ({ loaderData }) => ({
    links: (loaderData?.preloadImages ?? []).map((href) => ({
      rel: "preload" as const,
      as: "image",
      href,
    })),
  }),
});

function PublicLayout() {
  const navigate = useNavigate();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const queryClient = useQueryClient();

  // 导航项由 features 开关驱动：关闭的板块不出现在导航里。
  // 路由侧的 404 由各路由的 beforeLoad → requireFeature 保证。
  const navOptions = [
    { label: m.nav_home(), to: "/" as const, id: "home" },
    { label: m.nav_posts(), to: "/posts" as const, id: "posts" },
    ...(isFeatureEnabled(siteConfig, "moments")
      ? [{ label: m.nav_moments(), to: "/moments" as const, id: "moments" }]
      : []),
    ...(isFeatureEnabled(siteConfig, "library")
      ? [{ label: m.nav_library(), to: "/library" as const, id: "library" }]
      : []),
    {
      label: m.nav_friend_links(),
      to: "/friend-links" as const,
      id: "friend-links",
    },
    ...(isFeatureEnabled(siteConfig, "about")
      ? [{ label: m.nav_about(), to: "/about" as const, id: "about" }]
      : []),
  ];

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(m.auth_logout_failed(), {
        description:
          getLogoutAuthErrorMessage(error, m) ?? m.auth_logout_failed_desc(),
      });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    toast.success(m.auth_logout_success(), {
      description: m.auth_logout_success_desc(),
    });
  };

  // Global shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <theme.PublicLayout
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </theme.PublicLayout>
      <theme.Toaster />
    </>
  );
}
