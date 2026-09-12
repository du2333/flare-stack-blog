import { useState } from "react";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { getSocialLoginAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";
import { normalizeRedirectUrl } from "./normalize-redirect-url";

interface UseSocialLoginOptions {
  redirectTo?: string;
}

export function useSocialLogin(options: UseSocialLoginOptions) {
  const { redirectTo } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousLocation = usePreviousLocation();
  const callbackURL = normalizeRedirectUrl(redirectTo, previousLocation);

  const handleGithubLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await authClient.signIn.social({
        provider: "github",
        errorCallbackURL: `${window.location.origin}/login`,
        callbackURL,
      });
      if (error)
        setErrorMessage(
          getSocialLoginAuthErrorMessage(error, m) ??
            m.auth_error_default_desc(),
        );
    } catch {
      setErrorMessage(m.auth_error_default_desc());
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    turnstilePending: false,
    handleGithubLogin,
  };
}
