import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { AUTH_KEYS } from "@/features/auth/queries";

const registerSchema = z
  .object({
    name: z.string().min(2, "昵称至少 2 位"),
    email: z.email("无效的邮箱格式"),
    password: z.string().min(8, "密码至少 8 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "密码输入不一致",
    path: ["confirmPassword"],
  });

type RegisterSchema = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { isEmailConfigured } = useRouteContext({ from: "/_auth" });
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = React.useState(false);
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();
  const {
    isPending: turnstilePending,
    token: turnstileToken,
    turnstileProps,
  } = useTurnstile("register");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
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

    if (error) {
      toast.error("注册失败", {
        description: error.message || "服务器连接异常，请稍后重试。",
      });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    if (isEmailConfigured) {
      setIsSuccess(true);
      toast.success("账号已创建", {
        description: "验证邮件已发送，请检查您的收件箱。",
      });
    } else {
      toast.success("注册成功", {
        description: "账号已激活。",
      });
      navigate({ to: previousLocation });
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            [ EMAIL_SENT ]
          </p>
          <h3 className="text-xl font-serif font-medium tracking-tight">
            验证您的邮箱
          </h3>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            一封验证邮件已发送至您的邮箱。请点击邮件中的链接以激活账户。
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all"
        >
          返回登录
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Turnstile {...turnstileProps} />
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            用户昵称
          </label>
          <Input
            type="text"
            {...register("name")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder="输入您的昵称"
          />
          {errors.name && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.name.message}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            邮箱地址
          </label>
          <Input
            type="email"
            {...register("email")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder="example@mail.com"
          />
          {errors.email && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.email.message}
            </span>
          )}
        </div>

        {/* Passwords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
              密码
            </label>
            <Input
              type="password"
              {...register("password")}
              className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
              确认密码
            </label>
            <Input
              type="password"
              {...register("confirmPassword")}
              className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || turnstilePending}
        className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <span>创建账户</span>
        )}
      </button>
    </form>
  );
}
