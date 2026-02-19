import { Link } from "@tanstack/react-router";
import { ForgotPasswordForm } from "./form";
import type { ForgotPasswordPageProps } from "@/features/theme/contract/pages";

export function ForgotPasswordPage({
  forgotPasswordForm,
  turnstileElement,
}: ForgotPasswordPageProps) {
  if (forgotPasswordForm.isSent) {
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
            <span className="text-foreground">
              {forgotPasswordForm.sentEmail}
            </span>
            。
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ FORGOT_PASSWORD ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          找回密码
        </h1>
      </header>

      <div className="space-y-6">
        <ForgotPasswordForm form={forgotPasswordForm} />
        {turnstileElement}
      </div>
    </div>
  );
}
