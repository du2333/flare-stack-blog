import { Link } from "@tanstack/react-router";
import type { ForgotPasswordPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { ForgotPasswordForm } from "./form";

export function ForgotPasswordPage({
  forgotPasswordForm,
  turnstileElement,
}: ForgotPasswordPageProps) {
  if (forgotPasswordForm.isSent) {
    return (
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            [ {m.forgot_password_success_label()} ]
          </p>
          <h3 className="text-xl font-serif font-medium tracking-tight">
            {m.forgot_password_success_title()}
          </h3>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            {m.forgot_password_success_desc({
              email: forgotPasswordForm.sentEmail,
            })}
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          {m.forgot_password_back_to_login()}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ {m.forgot_password_label()} ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {m.forgot_password_title()}
        </h1>
      </header>

      <div className="space-y-6">
        <ForgotPasswordForm form={forgotPasswordForm} />
        {turnstileElement}
      </div>
    </div>
  );
}
