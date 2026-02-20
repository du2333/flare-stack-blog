import { Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import type { ForgotPasswordPageProps } from "@/features/theme/contract/pages";

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
            查收您的邮件
          </h3>
          <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
            重置密码链接已发送至{" "}
            <span className="text-(--fuwari-primary) font-bold">
              {forgotPasswordForm.sentEmail}
            </span>
            。
          </p>
        </div>
        <Link
          to="/login"
          className="w-full py-3.5 rounded-xl fuwari-btn-regular font-bold text-sm transition-all active:scale-[0.98] mt-4"
        >
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold fuwari-text-90">找回密码</h1>
        <p className="text-sm font-medium fuwari-text-50">
          请输入您的注册邮箱，我们将向您发送重置密码的链接
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
            <label htmlFor="auth-email" className="text-sm font-bold ml-1">
              注册邮箱
            </label>
            <input
              id="auth-email"
              type="email"
              {...register("email")}
              placeholder="example@mail.com"
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
                <span>发送中...</span>
              </>
            ) : (
              <span>发送重置链接</span>
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
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
