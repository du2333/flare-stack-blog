import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { AUTH_KEYS } from "@/features/auth/queries";

const loginSchema = z.object({
  email: z.email("无效的邮箱格式"),
  password: z.string().min(1, "请输入密码"),
});

type LoginSchema = z.infer<typeof loginSchema>;

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
          form.setError("root", { message: "邮箱尚未验证" });
          setIsUnverifiedEmail(true);
          break;
        case "INVALID_EMAIL_OR_PASSWORD":
          form.setError("root", { message: "无效的账号或密码" });
          break;
        default:
          if (error.message?.includes("Turnstile")) {
            form.setError("root", {
              message: "人机验证失败，请等待验证完成后重试",
            });
          } else {
            form.setError("root", { message: error.message || "登录失败" });
          }
      }

      toast.error("登录失败", { description: error.message });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
    setLoginStep("SUCCESS");

    setTimeout(() => {
      navigate({ to: redirectTo ?? previousLocation });
      toast.success("欢迎回来");
    }, 800);
  };

  const handleResendVerification = async () => {
    if (!emailValue) return;
    if (turnstilePending) {
      toast.error("请等待人机验证完成");
      return;
    }

    const loadingToast = toast.loading("正在发送验证邮件...");

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
        toast.error("人机验证失败", { description: "请等待验证完成后重试" });
      } else {
        toast.error("发送失败，请稍后重试", { description: error.message });
      }
      return;
    }

    toast.success("验证邮件已发送", { description: "请检查您的收件箱" });
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
