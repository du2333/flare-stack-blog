import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import theme from "@theme";
import { ErrorPage } from "@/components/common/error-page";
import { CACHE_CONTROL } from "@/lib/constants";
import { AUTH_KEYS, sessionQuery } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";

export const Route = createFileRoute("/_user")({
  loader: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQuery);
    return { session };
  },
  component: UserLayout,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

const navOptions = [
  { label: "主页", to: "/" as const, id: "home" },
  { label: "文章", to: "/posts" as const, id: "posts" },
  { label: "友链", to: "/friend-links" as const, id: "friend-links" },
];

function UserLayout() {
  const { session } = Route.useLoaderData();
  const navigate = useNavigate();
  const { isPending: isSessionPending } = authClient.useSession();
  const queryClient = useQueryClient();

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("会话终止失败, 请稍后重试。", {
        description: error.message,
      });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    toast.success("会话已终止", {
      description: "你已安全退出当前会话。",
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
      <theme.UserLayout
        isAuthenticated={!!session?.user}
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </theme.UserLayout>
      <theme.Toaster />
    </>
  );
}
