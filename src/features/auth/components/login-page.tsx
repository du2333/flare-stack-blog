import { Link } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { type ReactNode } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { GithubIcon } from "@/components/common/brand-icon";
import type { useLoginForm } from "../hooks/use-login-form";
import type { useSocialLogin } from "../hooks/use-social-login";
import { m } from "@/paraglide/messages";

interface LoginPageProps {
  isEmailConfigured: boolean;
  loginForm: ReturnType<typeof useLoginForm> & { turnstilePending: boolean };
  socialLogin: ReturnType<typeof useSocialLogin>;
  turnstileElement: ReactNode;
}

export function LoginPage({
  isEmailConfigured,
  loginForm,
  socialLogin,
  turnstileElement,
}: LoginPageProps) {
  const {
    register,
    errors,
    handleSubmit,
    loginStep,
    isSubmitting,
    turnstilePending,
    loginError,
    resendFeedback,
    isResending,
    resendVerification,
  } = loginForm;
  const busy =
    isSubmitting ||
    loginStep !== "IDLE" ||
    socialLogin.isLoading ||
    isResending;
  return (
    <div className="auth-page">
      <header className="auth-heading">
        <h1>{m.login_title()}</h1>
        <p>{m.login_welcome_back()}</p>
      </header>
      <button
        type="button"
        onClick={socialLogin.handleGithubLogin}
        disabled={busy}
        className={`auth-action ${isEmailConfigured ? "fuwari-btn-regular" : "fuwari-btn-primary"}`}
      >
        {socialLogin.isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <GithubIcon size={18} />
        )}
        {socialLogin.isLoading
          ? m.login_social_connecting()
          : m.login_github_continue()}
      </button>
      {socialLogin.errorMessage && (
        <p className="auth-error" role="alert">
          {socialLogin.errorMessage}
        </p>
      )}
      {isEmailConfigured && (
        <>
          <div className="auth-divider">
            <span>{m.login_email_alternative()}</span>
          </div>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="auth-email">{m.login_email_address()}</label>
              <input
                id="auth-email"
                {...register("email")}
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={m.login_email_placeholder()}
                disabled={busy}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "auth-email-error" : undefined}
              />
              {errors.email && (
                <p id="auth-email-error" className="auth-error">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="auth-field">
              <div className="auth-password-label">
                <label htmlFor="auth-password">{m.login_password()}</label>
                <Link to="/forgot-password">
                  {m.login_forgot_password_fuwari()}
                </Link>
              </div>
              <PasswordInput
                id="auth-password"
                {...register("password")}
                autoComplete="current-password"
                placeholder={m.login_password_placeholder()}
                disabled={busy}
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "auth-password-error" : undefined
                }
              />
              {errors.password && (
                <p id="auth-password-error" className="auth-error">
                  {errors.password.message}
                </p>
              )}
            </div>
            {loginError && (
              <div className="auth-feedback" role="alert">
                <p>{loginError.message}</p>
                {loginError.unverified && (
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={busy || turnstilePending}
                  >
                    {isResending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {m.login_resend_verification()}
                  </button>
                )}
              </div>
            )}
            {resendFeedback && (
              <p className="auth-note" role="status">
                {resendFeedback}
              </p>
            )}
            <div className="auth-verification">{turnstileElement}</div>
            <button
              type="submit"
              className="auth-action fuwari-btn-primary"
              disabled={busy || turnstilePending}
            >
              {loginStep === "VERIFYING" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : loginStep === "SUCCESS" ? (
                <Check size={16} />
              ) : null}
              {loginStep === "VERIFYING"
                ? m.login_submitting()
                : loginStep === "SUCCESS"
                  ? m.login_toast_success()
                  : m.login_email_submit()}
            </button>
          </form>
          <footer className="auth-register">
            {m.login_no_account()}{" "}
            <Link to="/register">{m.login_email_register()}</Link>
          </footer>
        </>
      )}
    </div>
  );
}
