import { Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import type { ForgotPasswordPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function ForgotPasswordPage({
  forgotPasswordForm,
  turnstileElement,
}: ForgotPasswordPageProps) {
  const { register, errors, handleSubmit, isSubmitting, turnstilePending } =
    forgotPasswordForm;

  const isFormDisabled = isSubmitting || turnstilePending;

  if (forgotPasswordForm.isSent) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
        <div className="w-16 h-16 rounded-full bg-(--fuwari-primary)/10 text-(--fuwari-primary) flex items-center justify-center mb-2">
          <MailCheck size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold fuwari-text-90 tracking-tight">
            {m.forgot_password_success_title()}
          </h3>
          <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
            {m.forgot_password_success_desc({
              email: forgotPasswordForm.sentEmail,
            })}
          </p>
        </div>
        <Link
          to="/login"
          className="w-full py-3.5 rounded-xl fuwari-btn-regular font-bold text-sm transition-all active:scale-[0.98] mt-4"
        >
          {m.forgot_password_back_to_login()}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold fuwari-text-90">
          {m.forgot_password_title()}
        </h1>
        <p className="text-sm font-medium fuwari-text-50">
          {m.forgot_password_header_desc()}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
            <label htmlFor="auth-email" className="text-sm font-bold ml-1">
              {m.forgot_password_email_label()}
            </label>
            <input
              id="auth-email"
              type="email"
              {...register("email")}
              placeholder={m.login_email_placeholder()}
              disabled={isFormDisabled}
              className="w-full bg-(--fuwari-input-bg) border border-(--fuwari-input-border) rounded-xl px-4 py-3 text-(--fuwari-text-90) placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all text-sm outline-none"
            />
            {errors.email && (
              <span className="text-xs text-red-500 ml-1 mt-1 font-medium">
                {errors.email.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="mt-4 w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm tracking-wide active:scale-[0.98] transition-all flex justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>{m.forgot_password_submitting()}</span>
              </>
            ) : (
              <span>{m.forgot_password_submit()}</span>
            )}
          </button>
        </form>

        {turnstileElement}

        {/* Footer Link */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="text-sm font-medium text-(--fuwari-primary) hover:underline flex items-center justify-center gap-1"
          >
            {m.register_back_to_login()}
          </Link>
        </div>
      </div>
    </div>
  );
}
