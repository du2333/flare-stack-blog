import { Loader2 } from "lucide-react";
import type { ResetPasswordFormData } from "@/features/theme/contract/pages";
import { Input } from "@/components/ui/input";

interface ResetPasswordFormProps {
  form: ResetPasswordFormData;
}

export function ResetPasswordForm({ form }: ResetPasswordFormProps) {
  const { register, errors, handleSubmit, isSubmitting } = form;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="text-sm text-muted-foreground/60 font-light leading-relaxed">
        您的身份已验证。请在下方输入新密码以完成重置。
      </p>

      <div className="space-y-6">
        <div className="space-y-2 group">
          <label
            htmlFor="new-password"
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors"
          >
            新密码
          </label>
          <Input
            type="password"
            id="new-password"
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
          <label
            htmlFor="confirm-password"
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors"
          >
            确认新密码
          </label>
          <Input
            type="password"
            id="confirm-password"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <span>更新密码</span>
        )}
      </button>
    </form>
  );
}
