import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import type { useRegisterForm } from "../hooks/use-register-form";
import { AuthField, AuthHeading, AuthStatus } from "./auth-elements";
import { m } from "@/paraglide/messages";

export function RegisterPage({
  registerForm: form,
  turnstileElement,
}: {
  isEmailConfigured: boolean;
  registerForm: ReturnType<typeof useRegisterForm>;
  turnstileElement: ReactNode;
}) {
  if (form.isSuccess)
    return (
      <AuthStatus
        state="email"
        title={m.register_success_title()}
        description={m.register_success_desc()}
      >
        <Link to="/login" className="auth-action fuwari-btn-primary">
          {m.register_back_to_login()}
        </Link>
      </AuthStatus>
    );
  return (
    <div className="auth-page">
      <AuthHeading
        title={m.register_header_title()}
        description={m.register_header_desc()}
      />
      <form className="auth-form" onSubmit={form.handleSubmit} noValidate>
        <fieldset disabled={form.isSubmitting}>
          <AuthField
            label={m.register_nickname()}
            error={form.errors.name?.message}
          >
            <input
              {...form.register("name")}
              autoComplete="nickname"
              maxLength={20}
              placeholder={m.register_nickname_placeholder()}
            />
          </AuthField>
          <AuthField
            label={m.login_email_address()}
            error={form.errors.email?.message}
          >
            <input
              {...form.register("email")}
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={m.login_email_placeholder()}
            />
          </AuthField>
          <AuthField
            label={m.register_password()}
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
            label={m.register_confirm_password()}
            error={form.errors.confirmPassword?.message}
          >
            <PasswordInput
              {...form.register("confirmPassword")}
              autoComplete="new-password"
              placeholder={m.login_password_placeholder()}
              disabled={form.isSubmitting}
            />
          </AuthField>
        </fieldset>
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
          {form.isSubmitting ? m.register_submitting() : m.register_submit()}
        </button>
      </form>
      <footer className="auth-register">
        {m.register_have_account()}{" "}
        <Link to="/login">{m.register_go_to_login()}</Link>
      </footer>
    </div>
  );
}
