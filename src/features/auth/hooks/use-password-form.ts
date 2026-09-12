import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";
import { getPasswordAuthErrorMessage } from "@/lib/auth/auth-errors";
import type { Messages } from "@/lib/i18n";
import { m } from "@/paraglide/messages";

const createPasswordSchema = (messages: Messages) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, messages.profile_validation_current_password_required()),
      newPassword: z
        .string()
        .min(8, messages.profile_validation_new_password_min()),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: messages.profile_validation_password_mismatch(),
      path: ["confirmPassword"],
    });

type PasswordSchema = z.infer<ReturnType<typeof createPasswordSchema>>;

export function usePasswordForm() {
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordSchema>({
    resolver: standardSchemaResolver(createPasswordSchema(m)),
  });

  const onSubmit = async (data: PasswordSchema) => {
    setFeedback(null);
    try {
      const { error } = await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        setFeedback({
          error: true,
          message:
            getPasswordAuthErrorMessage(error, m) ??
            m.auth_error_default_desc(),
        });
        return;
      }
      toast.success(m.profile_toast_password_updated());
      setFeedback({ error: false, message: m.profile_toast_security_synced() });
      reset();
    } catch {
      setFeedback({ error: true, message: m.profile_toast_update_failed() });
    }
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
    feedback,
    clear: () => {
      reset();
      setFeedback(null);
    },
  };
}
