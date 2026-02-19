import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "需要当前密码"),
    newPassword: z.string().min(8, "新密码至少 8 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type PasswordSchema = z.infer<typeof passwordSchema>;

export function usePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordSchema>({
    resolver: standardSchemaResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordSchema) => {
    const { error } = await authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error("更新失败", { description: error.message });
      return;
    }
    toast.success("密码已更新", { description: "你的安全设置已同步。" });
    reset();
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
  };
}

export type UsePasswordFormReturn = ReturnType<typeof usePasswordForm>;
