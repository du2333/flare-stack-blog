import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import type { RegisterPageProps } from "@/features/theme/contract/pages";

export function RegisterPage({
  registerForm,
  turnstileElement,
}: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold cuckoo-text-primary mb-2">
          创建账号
        </h1>
        <p className="cuckoo-text-secondary text-sm">注册以开始访问博客</p>
      </div>

      {/* Register Form */}
      <form onSubmit={registerForm.handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
            昵称
          </label>
          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
            />
            <input
              type="text"
              {...registerForm.register("name")}
              placeholder="请输入昵称"
              className="cuckoo-input pl-10"
            />
          </div>
          {registerForm.errors.name && (
            <p className="text-red-500 text-xs mt-1">
              {registerForm.errors.name.message}
            </p>
          )}
        </div>

        {/* Email Input */}
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
              {...registerForm.register("email")}
              placeholder="请输入邮箱"
              className="cuckoo-input pl-10"
            />
          </div>
          {registerForm.errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {registerForm.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
            密码
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
            />
            <input
              type={showPassword ? "text" : "password"}
              {...registerForm.register("password")}
              placeholder="请输入密码"
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
          {registerForm.errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {registerForm.errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
            确认密码
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 cuckoo-text-muted"
            />
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...registerForm.register("confirmPassword")}
              placeholder="请再次输入密码"
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
          {registerForm.errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {registerForm.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Turnstile */}
        {turnstileElement}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={registerForm.isSubmitting}
          className="w-full cuckoo-btn cuckoo-btn-primary py-3"
        >
          {registerForm.isSubmitting ? "注册中..." : "注册"}
        </button>
      </form>

      {/* Footer Link */}
      <div className="text-center">
        <Link
          to="/login"
          className="text-sm cuckoo-text-secondary hover:cuckoo-primary transition-colors"
        >
          已有账号？立即登录
        </Link>
      </div>
    </div>
  );
}
