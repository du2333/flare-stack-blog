import { createFileRoute, redirect } from "@tanstack/react-router";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { ForgotPasswordPage } from "@/features/auth/components/forgot-password-page";
import { useForgotPasswordForm } from "@/features/auth/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/_auth/forgot-password")({
  beforeLoad: ({ context }) => {
    if (!context.isEmailConfigured) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: m.forgot_password_title(),
      },
    ],
  }),
});

function RouteComponent() {
  const {
    isPending: turnstilePending,
    token: turnstileToken,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("forgot-password");

  const forgotPasswordForm = useForgotPasswordForm({
    turnstileToken,
    turnstilePending,
    resetTurnstile,
  });

  const turnstileElement = (
    <div className="flex justify-center">
      <Turnstile {...turnstileProps} />
    </div>
  );

  return (
    <ForgotPasswordPage
      forgotPasswordForm={{
        ...forgotPasswordForm,
        turnstilePending,
      }}
      turnstileElement={turnstileElement}
    />
  );
}
