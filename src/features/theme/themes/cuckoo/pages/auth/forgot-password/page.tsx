import { Link } from "@tanstack/react-router";
import { CheckCircle, Mail } from "lucide-react";
import type { ForgotPasswordPageProps } from "@/features/theme/contract/pages";

export function ForgotPasswordPage({
  forgotPasswordForm,
  turnstileElement,
}: ForgotPasswordPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold cuckoo-text-primary mb-2">
          找回密码
        </h1>
        <p className="cuckoo-text-secondary text-sm">
          输入您的邮箱，我们将发送重置密码链接
        </p>
      </div>

      {/* Success Message */}
      {forgotPasswordForm.isSent ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <p className="cuckoo-text-secondary">重置邮件已发送至</p>
          <p className="font-medium cuckoo-text-primary">
            {forgotPasswordForm.sentEmail}
          </p>
          <p className="text-sm cuckoo-text-muted">
            请检查您的邮箱并点击链接重置密码
          </p>
        </div>
      ) : (
        /* Form */
        <form onSubmit={forgotPasswordForm.handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
              邮箱
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
              />
              <input
                type="email"
                {...forgotPasswordForm.register("email")}
                placeholder="请输入邮箱"
                className="cuckoo-input pl-10"
              />
            </div>
            {forgotPasswordForm.errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {forgotPasswordForm.errors.email.message}
              </p>
            )}
          </div>

          {/* Turnstile */}
          {turnstileElement}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={forgotPasswordForm.isSubmitting}
            className="w-full cuckoo-btn cuckoo-btn-primary py-3"
          >
            {forgotPasswordForm.isSubmitting ? "发送中..." : "发送重置链接"}
          </button>
        </form>
      )}

      {/* Footer Link */}
      <div className="text-center">
        <Link
          to="/login"
          className="text-sm cuckoo-text-secondary hover:cuckoo-primary transition-colors"
        >
          返回登录
        </Link>
      </div>
    </div>
  );
}
