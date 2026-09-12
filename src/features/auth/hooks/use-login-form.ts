import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import {
  getLoginAuthErrorMessage,
  isEmailNotVerifiedError,
} from "@/lib/auth/auth-errors";
import type { Messages } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { normalizeRedirectUrl } from "./normalize-redirect-url";

const createLoginSchema = (messages: Messages) =>
  z.object({
    email: z.email(messages.login_validation_invalid_email()),
    password: z.string().min(1, messages.login_validation_password_required()),
  });

type LoginSchema = z.infer<ReturnType<typeof createLoginSchema>>;

interface UseLoginFormOptions {
  turnstileToken: string | null;
  turnstilePending: boolean;
  resetTurnstile: () => void;
  redirectTo?: string;
}

export function useLoginForm(options: UseLoginFormOptions) {
  const { turnstileToken, turnstilePending, resetTurnstile, redirectTo } =
    options;

  const [loginStep, setLoginStep] = useState<"IDLE" | "VERIFYING" | "SUCCESS">(
    "IDLE",
  );

  const [loginError, setLoginError] = useState<{
    message: string;
    email: string;
    unverified: boolean;
  } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();
  const loginSchema = createLoginSchema(m);

  const form = useForm<LoginSchema>({
    resolver: standardSchemaResolver(loginSchema),
  });

  const performRedirect = (
    redirectTarget: string | undefined,
    fallback: string,
  ) => {
    const target = normalizeRedirectUrl(redirectTarget, fallback);

    if (target.startsWith("/api/")) {
      window.location.assign(target);
      return;
    }

    if (target.startsWith(window.location.origin)) {
      const url = new URL(target);
      navigate({ to: `${url.pathname}${url.search}${url.hash}` });
      return;
    }

    window.location.assign(target);
  };

  const emailValue = form.watch("email");
  const latestResendStateRef = useRef({
    emailValue: "",
    turnstilePending,
    turnstileToken,
  });

  latestResendStateRef.current = {
    emailValue,
    turnstilePending,
    turnstileToken,
  };

  const onSubmit = async (data: LoginSchema) => {
    setLoginStep("VERIFYING");
    setLoginError(null);
    setResendFeedback(null);
    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        fetchOptions: {
          headers: { "X-Turnstile-Token": turnstileToken || "" },
        },
      });
      if (error) {
        setLoginStep("IDLE");
        setLoginError({
          message:
            getLoginAuthErrorMessage(error, m) ?? m.auth_error_default_desc(),
          email: data.email,
          unverified: isEmailNotVerifiedError(error),
        });
        return;
      }
    } catch {
      setLoginStep("IDLE");
      setLoginError({
        message: m.auth_error_default_desc(),
        email: data.email,
        unverified: false,
      });
      return;
    } finally {
      resetTurnstile();
    }

    resetAuthBoundQueries(queryClient);
    setLoginStep("SUCCESS");

    setTimeout(() => {
      performRedirect(redirectTo, previousLocation);
      toast.success(m.login_toast_success());
    }, 800);
  };

  const handleResendVerification = async () => {
    const {
      emailValue: currentEmailValue,
      turnstilePending: isTurnstilePending,
      turnstileToken: currentTurnstileToken,
    } = latestResendStateRef.current;

    if (!currentEmailValue) return;
    if (isTurnstilePending) {
      toast.error(m.login_toast_wait_turnstile());
      return;
    }

    if (
      isResending ||
      !loginError?.unverified ||
      loginError.email !== currentEmailValue
    )
      return;
    setIsResending(true);
    setResendFeedback(null);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: currentEmailValue,
        callbackURL: `${window.location.origin}/verify-email`,
        fetchOptions: {
          headers: { "X-Turnstile-Token": currentTurnstileToken || "" },
        },
      });
      setResendFeedback(
        error
          ? (getLoginAuthErrorMessage(error, m) ?? m.auth_error_default_desc())
          : m.login_toast_check_inbox(),
      );
    } catch {
      setResendFeedback(m.login_toast_send_failed());
    } finally {
      resetTurnstile();
      setIsResending(false);
    }
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(onSubmit),
    loginStep,
    isSubmitting: form.formState.isSubmitting,
    loginSchema,
    loginError: loginError?.email === emailValue ? loginError : null,
    resendFeedback: loginError?.email === emailValue ? resendFeedback : null,
    isResending,
    resendVerification: handleResendVerification,
  };
}
