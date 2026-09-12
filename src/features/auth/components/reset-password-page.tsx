import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import type { useResetPasswordForm } from "../hooks/use-reset-password-form";
import { AuthField, AuthHeading, AuthStatus } from "./auth-elements";
import { m } from "@/paraglide/messages";

export function ResetPasswordPage({
  resetPasswordForm: form,
  token,
  error,
}: {
  resetPasswordForm: ReturnType<typeof useResetPasswordForm>;
  token: string | undefined;
  error: string | undefined;
}) {
  if (!token || error)
    return (
      <AuthStatus
        state="error"
        title={
          error
            ? m.reset_password_error_expired_title()
            : m.reset_password_error_missing_token()
        }
        description={
          error
            ? m.reset_password_toast_failed_desc()
            : m.reset_password_error_missing_token_desc()
        }
      >
        <Link to="/forgot-password" className="auth-action fuwari-btn-primary">
          {m.reset_password_request_new_link()}
        </Link>
        <Link to="/login" className="auth-status-link">
          {m.forgot_password_back_to_login()}
        </Link>
      </AuthStatus>
    );
  if (form.isSuccess)
    return (
      <AuthStatus
        state="success"
        title={m.reset_password_toast_success()}
        description={m.reset_password_toast_success_desc()}
      >
        <Link to="/login" className="auth-action fuwari-btn-primary">
          {m.forgot_password_back_to_login()}
        </Link>
      </AuthStatus>
    );
  return (
    <div className="auth-page">
      <AuthHeading
        title={m.reset_password_title()}
        description={m.reset_password_header_desc()}
      />
      <form className="auth-form" onSubmit={form.handleSubmit} noValidate>
        <AuthField
          label={m.reset_password_new_password()}
          error={form.errors.password?.message}
        >
          <PasswordInput
            {...form.register("password")}
            autoComplete="new-password"
            placeholder={m.login_password_placeholder()}
            disabled={form.isSubmitting}
          />
        </AuthField>
        <AuthField
          label={m.reset_password_confirm_new_password()}
          error={form.errors.confirmPassword?.message}
        >
          <PasswordInput
            {...form.register("confirmPassword")}
            autoComplete="new-password"
            placeholder={m.login_password_placeholder()}
            disabled={form.isSubmitting}
          />
        </AuthField>
        {form.submitError && (
          <div className="auth-feedback" role="alert">
            <p>{form.submitError}</p>
            <Link to="/forgot-password">
              {m.reset_password_request_new_link()}
            </Link>
          </div>
        )}
        <button
          type="submit"
          className="auth-action fuwari-btn-primary"
          disabled={form.isSubmitting}
        >
          {form.isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {form.isSubmitting
            ? m.reset_password_submitting()
            : m.reset_password_submit()}
        </button>
      </form>
    </div>
  );
}
