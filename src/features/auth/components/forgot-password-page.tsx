import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { useForgotPasswordForm } from "../hooks/use-forgot-password-form";
import { AuthField, AuthHeading, AuthStatus } from "./auth-elements";
import { m } from "@/paraglide/messages";

export function ForgotPasswordPage({
  forgotPasswordForm: form,
  turnstileElement,
}: {
  forgotPasswordForm: ReturnType<typeof useForgotPasswordForm>;
  turnstileElement: ReactNode;
}) {
  if (form.isSent)
    return (
      <AuthStatus
        state="email"
        title={m.forgot_password_success_title()}
        description={m.forgot_password_success_desc({ email: form.sentEmail })}
      >
        <Link to="/login" className="auth-action fuwari-btn-primary">
          {m.forgot_password_back_to_login()}
        </Link>
      </AuthStatus>
    );
  return (
    <div className="auth-page">
      <AuthHeading
        title={m.forgot_password_title()}
        description={m.forgot_password_header_desc()}
      />
      <form className="auth-form" onSubmit={form.handleSubmit} noValidate>
        <AuthField
          label={m.forgot_password_email_label()}
          error={form.errors.email?.message}
        >
          <input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={m.login_email_placeholder()}
            disabled={form.isSubmitting}
          />
        </AuthField>
        {form.submitError && (
          <p className="auth-feedback" role="alert">
            {form.submitError}
          </p>
        )}
        <div className="auth-verification">{turnstileElement}</div>
        <button
          type="submit"
          className="auth-action fuwari-btn-primary"
          disabled={form.isSubmitting || form.turnstilePending}
        >
          {form.isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {form.isSubmitting
            ? m.forgot_password_submitting()
            : m.forgot_password_submit()}
        </button>
      </form>
      <footer className="auth-register">
        <Link to="/login">{m.register_back_to_login()}</Link>
      </footer>
    </div>
  );
}
