import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ResetPasswordPageProps } from "@/features/theme/contract/pages";

export function ResetPasswordPage({
  resetPasswordForm,
  token,
  error,
}: ResetPasswordPageProps) {
  const { register, errors, handleSubmit, isSubmitting } = resetPasswordForm;

  if (!token && !error) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
          <AlertCircle size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold fuwari-text-90 tracking-tight">
            无法重置密码
          </h3>
          <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
            缺少必需的授权令牌，请重新获取链接。
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
          <AlertCircle size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold fuwari-text-90 tracking-tight">
            重置链接无效或已过期
          </h3>
          <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
            {error}
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm transition-all active:scale-[0.98] mt-4"
        >
          重新请求链接
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold fuwari-text-90">重置密码</h1>
        <p className="text-sm font-medium fuwari-text-50">
          您的身份已验证。请在下方输入新密码以完成重置
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* New Password Field */}
          <div className="flex flex-col gap-1.5 focus-within:text-(--fuwari-primary) transition-colors text-(--fuwari-text-50)">
            <label htmlFor="new-password" className="text-sm font-bold ml-1">
              新密码
            </label>
            <input
              id="new-password"
              type="password"
              {...register("password")}
              placeholder="••••••••"
              disabled={isSubmitting}
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
              htmlFor="confirm-password"
              className="text-sm font-bold ml-1"
            >
              确认新密码
            </label>
            <input
              id="confirm-password"
              type="password"
              {...register("confirmPassword")}
              placeholder="••••••••"
              disabled={isSubmitting}
              className="w-full bg-(--fuwari-input-bg) border border-(--fuwari-input-border) rounded-xl px-4 py-3 text-(--fuwari-text-90) placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all text-sm outline-none"
            />
            {errors.confirmPassword && (
              <span className="text-xs text-red-500 ml-1 mt-1 font-medium">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm tracking-wide active:scale-[0.98] transition-all flex justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>更新中...</span>
              </>
            ) : (
              <span>更新密码</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
