import { Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import type { RegisterPageProps } from "@/features/theme/contract/pages";

export function RegisterPage({
  registerForm,
  turnstileElement,
}: RegisterPageProps) {
  const { register, errors, handleSubmit, isSubmitting, turnstilePending } =
    registerForm;

  const isFormDisabled = isSubmitting || turnstilePending;

  if (registerForm.isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
        <div className="w-16 h-16 rounded-full bg-(--fuwari-primary)/10 text-(--fuwari-primary) flex items-center justify-center mb-2">
          <MailCheck size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold fuwari-text-90 tracking-tight">
            验证您的邮箱
          </h3>
          <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
            一封验证邮件已发送至您的邮箱。请点击邮件中的链接以激活账户。
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
        <h1 className="text-2xl font-bold fuwari-text-90">注册账户</h1>
        <p className="text-sm font-medium fuwari-text-50">
          欢迎加入，填写以下信息创建新账户
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name Field */}
          <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
            <label htmlFor="reg-name" className="text-sm font-bold ml-1">
              用户昵称
            </label>
            <input
              id="reg-name"
              type="text"
              {...register("name")}
              placeholder="输入您的昵称"
              disabled={isFormDisabled}
              className="w-full bg-(--fuwari-input-bg) border border-(--fuwari-input-border) rounded-xl px-4 py-3 text-(--fuwari-text-90) placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all text-sm outline-none"
            />
            {errors.name && (
              <span className="text-xs text-red-500 ml-1 mt-1 font-medium">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
            <label htmlFor="reg-email" className="text-sm font-bold ml-1">
              邮箱地址
            </label>
            <input
              id="reg-email"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4">
            {/* Password Field */}
            <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
              <label htmlFor="reg-password" className="text-sm font-bold ml-1">
                密码
              </label>
              <input
                id="reg-password"
                type="password"
                {...register("password")}
                placeholder="••••••••"
                disabled={isFormDisabled}
                className="w-full bg-(--fuwari-input-bg) border border-(--fuwari-input-border) rounded-xl px-4 py-3 text-(--fuwari-text-90) placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all text-sm outline-none"
              />
              {errors.password && (
                <span className="text-xs text-red-500 ml-1 mt-1 font-medium">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
              <label
                htmlFor="reg-confirm-password"
                className="text-sm font-bold ml-1"
              >
                确认密码
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                {...register("confirmPassword")}
                placeholder="••••••••"
                disabled={isFormDisabled}
                className="w-full bg-(--fuwari-input-bg) border border-(--fuwari-input-border) rounded-xl px-4 py-3 text-(--fuwari-text-90) placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all text-sm outline-none"
              />
              {errors.confirmPassword && (
                <span className="text-xs text-red-500 ml-1 mt-1 font-medium">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="mt-4 w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm tracking-wide active:scale-[0.98] transition-all gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>提交中...</span>
              </>
            ) : (
              <span>创建账户</span>
            )}
          </button>
        </form>

        {turnstileElement}

        {/* Footer Link */}
        <div className="text-center pt-2">
          <p className="text-sm font-medium fuwari-text-50">
            已有账户?{" "}
            <Link
              to="/login"
              className="text-(--fuwari-primary) hover:underline"
            >
              前往登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
