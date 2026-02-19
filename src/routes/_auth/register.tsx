import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import theme from "@theme";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { useRegisterForm } from "@/features/auth/hooks";

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
        title: "注册",
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
    <theme.RegisterPage
      isEmailConfigured={isEmailConfigured}
      registerForm={{ ...registerForm, turnstileProps }}
      turnstileElement={turnstileElement}
    />
  );
}
