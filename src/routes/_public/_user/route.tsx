import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorPage } from "@/components/common/error-page";
import { UserLayout } from "@/components/layout/user-layout";
import { sessionQuery } from "@/features/auth/queries";
import { CACHE_CONTROL } from "@/lib/constants";

export const Route = createFileRoute("/_public/_user")({
  loader: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQuery);
    return { session };
  },
  component: UserGate,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

function UserGate() {
  const { session } = Route.useLoaderData();

  return (
    <UserLayout isAuthenticated={!!session?.user}>
      <Outlet />
    </UserLayout>
  );
}
