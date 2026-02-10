import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { authClient } from "@/lib/auth/auth.client";

const forgotPasswordSchema = z.object({
  email: z.email("无效的邮箱格式"),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    isPending: turnstilePending,
    token: turnstileToken,
    turnstileProps,
  } = useTurnstile("forgot-password");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
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

    if (error) {
      toast.error("重置邮件发送失败");
      return;
    }

    setSentEmail(data.email);
    setIsSent(true);
    toast.success("重置邮件已发送", {
      description: "请检查您的收件箱以获取重置链接。",
    });
  };

  if (isSent) {
    return (
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            [ EMAIL_SENT ]
          </p>
          <h3 className="text-xl font-serif font-medium tracking-tight">
            查收您的邮件
          </h3>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            重置密码链接已发送至{" "}
            <span className="text-foreground">{sentEmail}</span>。
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
      <p className="text-sm text-muted-foreground/60 font-light leading-relaxed">
        请输入您的注册邮箱，我们将向您发送重置密码的链接。
      </p>

      <div className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            注册邮箱
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
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={isSubmitting || turnstilePending}
          className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <span>发送重置链接</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: "/login" })}
          className="w-full text-[9px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          [ ← 返回登录 ]
        </button>
      </div>
    </form>
  );
}
