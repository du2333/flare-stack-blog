import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth-layout";
import { emailConfiguredQuery, readSession } from "@/features/auth/queries";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { CACHE_CONTROL } from "@/lib/constants";

export const Route = createFileRoute("/_public/_auth")({
  beforeLoad: async ({ context }) => {
    const session = await readSession(context.queryClient);
    const isEmailConfigured =
      await context.queryClient.fetchQuery(emailConfiguredQuery);

    if (session) {
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
  const navigateBack = useNavigateBack({ fallbackTo: "/" });
  return (
    <AuthLayout onBack={navigateBack}>
      <Outlet />
    </AuthLayout>
  );
}
