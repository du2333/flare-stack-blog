import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import theme from "@theme";
import { useResetPasswordForm } from "@/features/auth/hooks";

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
        title: "重置密码",
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
