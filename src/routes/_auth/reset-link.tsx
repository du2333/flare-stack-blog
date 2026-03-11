import { createFileRoute, redirect } from "@tanstack/react-router";
import theme from "@theme";
import { z } from "zod";
import { useResetPasswordForm } from "@/features/auth/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_auth/reset-link")({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  beforeLoad: ({ context }) => {
    if (!context.isEmailConfigured) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: m.reset_password_title(),
      },
    ],
  }),
});

function RouteComponent() {
  const { token, error } = Route.useSearch();
  const resetPasswordForm = useResetPasswordForm({ token });

  return (
    <theme.ResetPasswordPage
      resetPasswordForm={resetPasswordForm}
      token={token}
      error={error}
    />
  );
}
