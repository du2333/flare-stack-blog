import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { RegisterPage } from "@/features/auth/components/register-page";
import { useRegisterForm } from "@/features/auth/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_auth/register")({
  beforeLoad: ({ context }) => {
    if (!context.isEmailConfigured) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: m.register_title(),
      },
    ],
  }),
});

function RouteComponent() {
  const { isEmailConfigured } = useRouteContext({ from: "/_auth" });
  const {
    isPending: turnstilePending,
    token: turnstileToken,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("register");

  const registerForm = useRegisterForm({
    turnstileToken,
    turnstilePending,
    resetTurnstile,
    isEmailConfigured,
  });

  const turnstileElement = (
    <div className="flex justify-center">
      <Turnstile {...turnstileProps} />
    </div>
  );

  return (
    <RegisterPage
      isEmailConfigured={isEmailConfigured}
      registerForm={{ ...registerForm, turnstileProps }}
      turnstileElement={turnstileElement}
    />
  );
}
