import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import theme from "@theme";
import { emailConfiguredQuery, sessionQuery } from "@/features/auth/queries";
import { CACHE_CONTROL } from "@/lib/constants";
import { useNavigateBack } from "@/hooks/use-navigate-back";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.fetchQuery(sessionQuery);
    const isEmailConfigured =
      await context.queryClient.fetchQuery(emailConfiguredQuery);

    if (session && !location.pathname.includes("verify-email")) {
      throw redirect({ to: "/" });
    }

    return { session, isEmailConfigured };
  },
  component: RouteComponent,
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

function RouteComponent() {
  const navigateBack = useNavigateBack();
  return (
    <>
      <theme.AuthLayout onBack={navigateBack}>
        <Outlet />
      </theme.AuthLayout>
      <theme.Toaster />
    </>
  );
}
