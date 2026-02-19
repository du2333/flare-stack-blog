import { Outlet, createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { ErrorPage } from "@/components/common/error-page";
import { CACHE_CONTROL } from "@/lib/constants";
import { sessionQuery } from "@/features/auth/queries";

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

function UserLayout() {
  const { session } = Route.useLoaderData();

  return (
    <theme.UserLayout isAuthenticated={!!session?.user}>
      <Outlet />
    </theme.UserLayout>
  );
}
