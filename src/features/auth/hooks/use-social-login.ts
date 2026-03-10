import { useState } from "react";
import { toast } from "sonner";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export interface UseSocialLoginOptions {
  turnstileToken: string | null;
  turnstilePending: boolean;
  resetTurnstile: () => void;
  redirectTo?: string;
}

export function useSocialLogin(options: UseSocialLoginOptions) {
  const { turnstileToken, turnstilePending, resetTurnstile, redirectTo } =
    options;

  const [isLoading, setIsLoading] = useState(false);
  const previousLocation = usePreviousLocation();

  const handleGithubLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const { error } = await authClient.signIn.social({
      provider: "github",
      errorCallbackURL: `${window.location.origin}/login`,
      callbackURL: `${window.location.origin}${redirectTo ?? previousLocation}`,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile();

    if (error) {
      if (error.message?.includes("Turnstile")) {
        toast.error(m.login_error_turnstile_failed_short(), {
          description: m.login_error_turnstile_failed_desc(),
        });
      } else {
        toast.error(m.login_toast_social_failed(), {
          description: error.message,
        });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return {
    isLoading,
    turnstilePending,
    handleGithubLogin,
  };
}

export type UseSocialLoginReturn = ReturnType<typeof useSocialLogin>;
