import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";
import { AUTH_KEYS } from "@/features/auth/queries";

const loginSchema = z.object({
  email: z.email("无效的邮箱格式"),
  password: z.string().min(1, "请输入密码"),
});

type LoginSchema = z.infer<typeof loginSchema>;

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [loginStep, setLoginStep] = useState<"IDLE" | "VERIFYING" | "SUCCESS">(
    "IDLE",
  );
  const [isUnverifiedEmail, setIsUnverifiedEmail] = useState(false);
  const { isEmailConfigured } = useRouteContext({ from: "/_auth" });

  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const queryClient = useQueryClient();
  const {
    isPending: turnstilePending,
    token: turnstileToken,
    turnstileProps,
  } = useTurnstile("login");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: standardSchemaResolver(loginSchema),
  });

  const emailValue = watch("email");

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

    if (error) {
      setLoginStep("IDLE");

      // Map error codes to user-friendly messages
      switch (error.code as keyof typeof authClient.$ERROR_CODES | undefined) {
        case "EMAIL_NOT_VERIFIED":
          setError("root", { message: "邮箱尚未验证" });
          setIsUnverifiedEmail(true);
          break;
        case "INVALID_EMAIL_OR_PASSWORD":
          setError("root", { message: "无效的账号或密码" });
          break;
        default:
          // Fallback: check message for Turnstile errors or use generic message
          if (error.message?.includes("Turnstile")) {
            setError("root", { message: "人机验证失败，请刷新页面重试" });
          } else {
            setError("root", { message: error.message || "登录失败" });
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

  const handleResendVerification = () => {
    if (!emailValue) return;
    toast.promise(
      authClient.sendVerificationEmail({
        email: emailValue,
        callbackURL: `${window.location.origin}/verify-email`,
        fetchOptions: {
          headers: { "X-Turnstile-Token": turnstileToken || "" },
        },
      }),
      {
        loading: "正在发送验证邮件...",
        success: "验证邮件已发送",
        error: "发送失败，请稍后重试",
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Turnstile {...turnstileProps} />
      {errors.root && (
        <div className="border-l-2 border-destructive p-4 space-y-2 animate-in fade-in duration-300">
          <p className="text-[10px] font-mono text-destructive uppercase tracking-widest">
            {errors.root.message}
          </p>
          {isUnverifiedEmail && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              [ 重新发送验证邮件 ]
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            邮箱地址
          </label>
          <Input
            type="email"
            {...register("email")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder="example@mail.com"
            autoComplete="username"
            disabled={isSubmitting || loginStep !== "IDLE"}
          />
          {errors.email && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
              登录密码
            </label>
            {isEmailConfigured && (
              <Link
                to="/forgot-password"
                tabIndex={-1}
                className="text-[9px] font-mono text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                [ 找回密码 ]
              </Link>
            )}
          </div>
          <Input
            type="password"
            {...register("password")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting || loginStep !== "IDLE"}
          />
          {errors.password && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.password.message}
            </span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || loginStep !== "IDLE" || turnstilePending}
        className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
      >
        {loginStep === "VERIFYING" ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <span>登录</span>
        )}
      </button>
    </form>
  );
}
