import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";
import { getForgotPasswordAuthErrorMessage } from "@/lib/auth/auth-errors";
import type { Messages } from "@/lib/i18n";
import { m } from "@/paraglide/messages";

const createForgotPasswordSchema = (messages: Messages) =>
  z.object({
    email: z.email(messages.register_validation_email_invalid()),
  });

type ForgotPasswordSchema = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;

export interface UseForgotPasswordFormOptions {
  turnstileToken: string | null;
  turnstilePending: boolean;
  resetTurnstile: () => void;
}

export function useForgotPasswordForm(options: UseForgotPasswordFormOptions) {
  const { turnstileToken, turnstilePending, resetTurnstile } = options;

  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const forgotPasswordSchema = createForgotPasswordSchema(m);

  const form = useForm<ForgotPasswordSchema>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchema) => {
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: `${window.location.origin}/reset-link`,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile();

    if (error) {
      toast.error(m.forgot_password_toast_failed(), {
        description:
          getForgotPasswordAuthErrorMessage(error, m) ??
          m.auth_error_default_desc(),
      });
      return;
    }

    setSentEmail(data.email);
    setIsSent(true);
    toast.success(m.forgot_password_toast_sent(), {
      description: m.forgot_password_toast_sent_desc(),
    });
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    isSent,
    sentEmail,
    turnstilePending,
  };
}

export type UseForgotPasswordFormReturn = ReturnType<
  typeof useForgotPasswordForm
>;
