import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import theme from "@theme";
import { useVerifyEmail } from "@/features/auth/hooks";

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
        title: "验证邮箱",
      },
    ],
  }),
});

function RouteComponent() {
  const { error } = Route.useSearch();
  const { status } = useVerifyEmail({ error });

  return <theme.VerifyEmailPage status={status} error={error} />;
}
