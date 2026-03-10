import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { AUTH_KEYS } from "@/features/auth/queries";

const createLoginSchema = (messages: Messages) =>
  z.object({
    email: z.email(messages.login_validation_invalid_email()),
    password: z.string().min(1, messages.login_validation_password_required()),
  });

type LoginSchema = z.infer<ReturnType<typeof createLoginSchema>>;

export interface UseLoginFormOptions {
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
  const [isUnverifiedEmail, setIsUnverifiedEmail] = useState(false);

  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();
  const loginSchema = createLoginSchema(m);

  const form = useForm<LoginSchema>({
    resolver: standardSchemaResolver(loginSchema),
  });

  const emailValue = form.watch("email");

  const onSubmit = async (data: LoginSchema) => {
    setLoginStep("VERIFYING");
    setIsUnverifiedEmail(false);

    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile();

    if (error) {
      setLoginStep("IDLE");

      switch (error.code as keyof typeof authClient.$ERROR_CODES | undefined) {
        case "EMAIL_NOT_VERIFIED":
          form.setError("root", {
            message: m.login_error_email_not_verified(),
          });
          setIsUnverifiedEmail(true);
          break;
        case "INVALID_EMAIL_OR_PASSWORD":
          form.setError("root", {
            message: m.login_error_invalid_credentials(),
          });
          break;
        default:
          if (error.message?.includes("Turnstile")) {
            form.setError("root", {
              message: m.login_error_turnstile_failed(),
            });
          } else {
            form.setError("root", {
              message: error.message || m.login_error_default(),
            });
          }
      }

      toast.error(m.login_error_default(), { description: error.message });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
    setLoginStep("SUCCESS");

    setTimeout(() => {
      navigate({ to: redirectTo ?? previousLocation });
      toast.success(m.login_toast_success());
    }, 800);
  };

  const handleResendVerification = async () => {
    if (!emailValue) return;
    if (turnstilePending) {
      toast.error(m.login_toast_wait_turnstile());
      return;
    }

    const loadingToast = toast.loading(m.login_toast_sending_verification());

    const { error } = await authClient.sendVerificationEmail({
      email: emailValue,
      callbackURL: `${window.location.origin}/verify-email`,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile();
    toast.dismiss(loadingToast);

    if (error) {
      if (error.message?.includes("Turnstile")) {
        toast.error(m.turnstile_error_failed_short(), {
          description: m.turnstile_error_failed_desc(),
        });
      } else {
        toast.error(m.login_toast_send_failed(), {
          description: error.message,
        });
      }
      return;
    }

    toast.success(m.login_toast_verification_sent(), {
      description: m.login_toast_check_inbox(),
    });
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(onSubmit),
    loginStep,
    isSubmitting: form.formState.isSubmitting,
    isUnverifiedEmail,
    rootError: form.formState.errors.root?.message,
    handleResendVerification,
    emailValue,
    loginSchema,
  };
}

export type UseLoginFormReturn = ReturnType<typeof useLoginForm>;
