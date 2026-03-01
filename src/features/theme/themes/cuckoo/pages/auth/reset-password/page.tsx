import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import type { ResetPasswordPageProps } from "@/features/theme/contract/pages";

export function ResetPasswordPage({
  resetPasswordForm,
  token,
  error,
}: ResetPasswordPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Invalid or missing token
  if (!token || error) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-red-500">
          <Lock className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">无效的链接</h1>
          <p className="cuckoo-text-secondary text-sm">
            {error || "重置链接已失效，请重新申请"}
          </p>
        </div>
        <Link to="/forgot-password" className="cuckoo-btn cuckoo-btn-primary">
          重新发送重置邮件
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold cuckoo-text-primary mb-2">
          重置密码
        </h1>
        <p className="cuckoo-text-secondary text-sm">请输入您的新密码</p>
      </div>

      {/* Form */}
      <form onSubmit={resetPasswordForm.handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
            新密码
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
            />
            <input
              type={showPassword ? "text" : "password"}
              {...resetPasswordForm.register("password")}
              placeholder="请输入新密码"
              className="cuckoo-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cuckoo-text-muted hover:cuckoo-text-secondary"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {resetPasswordForm.errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {resetPasswordForm.errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
            确认新密码
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
            />
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...resetPasswordForm.register("confirmPassword")}
              placeholder="请再次输入新密码"
              className="cuckoo-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cuckoo-text-muted hover:cuckoo-text-secondary"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {resetPasswordForm.errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {resetPasswordForm.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={resetPasswordForm.isSubmitting}
          className="w-full cuckoo-btn cuckoo-btn-primary py-3"
        >
          {resetPasswordForm.isSubmitting ? "重置中..." : "重置密码"}
        </button>
      </form>

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
