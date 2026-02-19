import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ForgotPasswordFormData } from "@/features/theme/contract/pages";
import { Input } from "@/components/ui/input";

interface ForgotPasswordFormProps {
  form: ForgotPasswordFormData;
}

export function ForgotPasswordForm({ form }: ForgotPasswordFormProps) {
  const { register, errors, handleSubmit, isSubmitting, turnstilePending } =
    form;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

        <Link
          to="/login"
          className="block w-full text-center text-[9px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          [ ← 返回登录 ]
        </Link>
      </div>
    </form>
  );
}
