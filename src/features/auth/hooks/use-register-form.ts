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

const registerSchema = z
  .object({
    name: z.string().min(2, "昵称至少 2 位").max(20, "昵称最多 20 位"),
    email: z.email("无效的邮箱格式"),
    password: z.string().min(8, "密码至少 8 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "密码输入不一致",
    path: ["confirmPassword"],
  });

type RegisterSchema = z.infer<typeof registerSchema>;

export interface UseRegisterFormOptions {
  turnstileToken: string | null;
  turnstilePending: boolean;
  resetTurnstile: () => void;
  isEmailConfigured: boolean;
}

export function useRegisterForm(options: UseRegisterFormOptions) {
  const {
    turnstileToken,
    turnstilePending,
    resetTurnstile,
    isEmailConfigured,
  } = options;

  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();

  const form = useForm<RegisterSchema>({
    resolver: standardSchemaResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchema) => {
    const { error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      callbackURL: `${window.location.origin}/verify-email`,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile();

    if (error) {
      if (error.message?.includes("Turnstile")) {
        toast.error("人机验证失败", { description: "请等待验证完成后重试" });
      } else {
        toast.error("注册失败", {
          description: error.message || "服务器连接异常，请稍后重试。",
        });
      }
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    if (isEmailConfigured) {
      setIsSuccess(true);
      toast.success("账号已创建", {
        description: "验证邮件已发送，请检查您的收件箱。",
      });
    } else {
      toast.success("注册成功", { description: "账号已激活。" });
      navigate({ to: previousLocation });
    }
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    isSuccess,
    turnstilePending,
  };
}

export type UseRegisterFormReturn = ReturnType<typeof useRegisterForm>;
