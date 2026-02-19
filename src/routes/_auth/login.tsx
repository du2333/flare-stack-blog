import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import theme from "@theme";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { useLoginForm, useSocialLogin } from "@/features/auth/hooks";

export const Route = createFileRoute("/_auth/login")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "登录",
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
  } = useTurnstile("login");

  const loginForm = useLoginForm({
    turnstileToken,
    turnstilePending,
    resetTurnstile,
  });

  const socialLogin = useSocialLogin({
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
    <theme.LoginPage
      isEmailConfigured={isEmailConfigured}
      loginForm={{
        ...loginForm,
        turnstileProps,
        turnstilePending,
      }}
      socialLogin={socialLogin}
      turnstileElement={turnstileElement}
    />
  );
}
