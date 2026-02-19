import { Link } from "@tanstack/react-router";
import { ResetPasswordForm } from "./form";
import type { ResetPasswordPageProps } from "@/features/theme/contract/pages";

export function ResetPasswordPage({
  resetPasswordForm,
  token,
  error,
}: ResetPasswordPageProps) {
  if (!token && !error) {
    return (
      <div className="text-center space-y-6 animate-in fade-in duration-500">
        <p className="text-sm text-destructive/70 font-light">
          错误：缺少授权令牌
        </p>
        <Link
          to="/login"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          返回登录
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-6 animate-in fade-in duration-500">
        <p className="text-sm text-destructive/70 font-light">
          错误：无效的链接 ({error})
        </p>
        <Link
          to="/forgot-password"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          重新请求链接
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ RESET_PASSWORD ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          重置密码
        </h1>
      </header>

      <ResetPasswordForm form={resetPasswordForm} />
    </div>
  );
}
