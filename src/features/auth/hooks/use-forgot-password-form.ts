import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";

const forgotPasswordSchema = z.object({
  email: z.email("无效的邮箱格式"),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export interface UseForgotPasswordFormOptions {
  turnstileToken: string | null;
  turnstilePending: boolean;
  resetTurnstile: () => void;
}

export function useForgotPasswordForm(options: UseForgotPasswordFormOptions) {
  const { turnstileToken, turnstilePending, resetTurnstile } = options;

  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

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
      if (error.message?.includes("Turnstile")) {
        toast.error("人机验证失败", { description: "请等待验证完成后重试" });
      } else {
        toast.error("重置邮件发送失败", { description: error.message });
      }
      return;
    }

    setSentEmail(data.email);
    setIsSent(true);
    toast.success("重置邮件已发送", {
      description: "请检查您的收件箱以获取重置链接。",
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
