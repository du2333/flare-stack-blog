import { createFileRoute, redirect } from "@tanstack/react-router";
import theme from "@theme";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { useForgotPasswordForm } from "@/features/auth/hooks";

export const Route = createFileRoute("/_auth/forgot-password")({
  beforeLoad: ({ context }) => {
    if (!context.isEmailConfigured) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "找回密码",
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
    <theme.ForgotPasswordPage
      forgotPasswordForm={{
        ...forgotPasswordForm,
        turnstileProps,
        turnstilePending,
      }}
      turnstileElement={turnstileElement}
    />
  );
}
