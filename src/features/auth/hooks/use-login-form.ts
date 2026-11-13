import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { getAuthClient } from "@/lib/auth/auth-client";
import {
  getRetryAfterMs,
  getSignInCodeAuthErrorMessage,
  isSignInCodeSpentError,
} from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";
import {
  getResendCooldownMs,
  isSignInCode,
  normalizeSignInCode,
} from "../utils/sign-in-code";
import { normalizeRedirectUrl } from "./normalize-redirect-url";
import { useCooldown } from "./use-cooldown";

export type LoginStep = "email" | "code" | "name";

const createEmailSchema = () =>
  z.object({
    email: z.email(m.login_validation_invalid_email()),
  });

const createCodeSchema = () =>
  z.object({
    code: z.string().refine(isSignInCode, m.login_validation_code()),
  });

type EmailSchema = z.infer<ReturnType<typeof createEmailSchema>>;
type CodeSchema = z.infer<ReturnType<typeof createCodeSchema>>;

interface UseLoginFormOptions {
  turnstileToken: string | null;
  resetTurnstile: () => void;
  redirectTo?: string;
}

export function useLoginForm(options: UseLoginFormOptions) {
  const { turnstileToken, resetTurnstile, redirectTo } = options;

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown();
  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();

  const emailForm = useForm<EmailSchema>({
    resolver: standardSchemaResolver(createEmailSchema()),
  });
  const codeForm = useForm<CodeSchema>({
    resolver: standardSchemaResolver(createCodeSchema()),
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
      void navigate({ to: `${url.pathname}${url.search}${url.hash}` });
      return;
    }

    window.location.assign(target);
  };

  const finish = () => {
    setSignedIn(true);
    setTimeout(() => {
      performRedirect(redirectTo, previousLocation);
      toast.success(m.login_toast_success());
    }, 800);
  };

  /** Emails a code and moves to the code step; false when it was refused. */
  const requestCode = async (address: string) => {
    setError(null);
    try {
      const { error: sendError } =
        await getAuthClient().emailOtp.sendVerificationOtp({
          email: address,
          type: "sign-in",
          fetchOptions: {
            headers: { "X-Turnstile-Token": turnstileToken || "" },
          },
        });
      if (sendError) {
        setError(
          getSignInCodeAuthErrorMessage(sendError) ??
            m.auth_error_default_desc(),
        );
        const retryAfterMs = getRetryAfterMs(sendError);
        if (retryAfterMs && step === "code") {
          cooldown.start(getResendCooldownMs(retryAfterMs));
        }
        return false;
      }
    } catch {
      setError(m.auth_error_default_desc());
      return false;
    } finally {
      resetTurnstile();
    }

    setEmail(address);
    cooldown.start(getResendCooldownMs());
    return true;
  };

  const onSubmitEmail = async (data: EmailSchema) => {
    if (!(await requestCode(data.email))) return;
    codeForm.reset();
    setStep("code");
  };

  const onSubmitCode = async (data: CodeSchema) => {
    setError(null);
    try {
      const { data: result, error: signInError } =
        await getAuthClient().signIn.emailOtp({
          email,
          otp: normalizeSignInCode(data.code),
        });
      if (signInError) {
        codeForm.reset();
        if (isSignInCodeSpentError(signInError)) {
          cooldown.clear();
          setStep("email");
        }
        setError(
          getSignInCodeAuthErrorMessage(signInError) ??
            m.auth_error_default_desc(),
        );
        return;
      }
      // Signed in from here on, even before the name step finishes.
      resetAuthBoundQueries(queryClient, "signed-in");
      if (!result.user.name.trim()) {
        setStep("name");
        return;
      }
    } catch {
      setError(m.auth_error_default_desc());
      return;
    }

    finish();
  };

  const resend = async () => {
    if (isResending || cooldown.secondsLeft > 0) return;
    setIsResending(true);
    try {
      if (await requestCode(email)) {
        codeForm.reset();
        toast.success(m.login_code_resent());
      }
    } finally {
      setIsResending(false);
    }
  };

  const changeEmail = () => {
    codeForm.reset();
    cooldown.clear();
    setError(null);
    setStep("email");
  };

  return {
    step,
    email,
    error,
    signedIn,
    isResending,
    resendSecondsLeft: cooldown.secondsLeft,
    emailForm: {
      register: emailForm.register,
      errors: emailForm.formState.errors,
    },
    codeForm: {
      register: codeForm.register,
      errors: codeForm.formState.errors,
    },
    isSubmitting:
      emailForm.formState.isSubmitting || codeForm.formState.isSubmitting,
    handleSubmit:
      step === "email"
        ? emailForm.handleSubmit(onSubmitEmail)
        : codeForm.handleSubmit(onSubmitCode),
    resend,
    changeEmail,
    finish,
  };
}
