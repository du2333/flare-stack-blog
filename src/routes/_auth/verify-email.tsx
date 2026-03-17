import { createFileRoute, redirect } from "@tanstack/react-router";
import theme from "@theme";
import { z } from "zod";
import { useVerifyEmail } from "@/features/auth/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_auth/verify-email")({
  validateSearch: z.object({
    error: z.string().optional().catch(undefined),
  }),
  beforeLoad: ({ context }) => {
    // If email verification is not required, redirect to login
    if (!context.isEmailConfigured) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: m.verify_email_title(),
      },
    ],
  }),
});

function RouteComponent() {
  const { error } = Route.useSearch();
  const { status } = useVerifyEmail({ error });

  return <theme.VerifyEmailPage status={status} error={error} />;
}
