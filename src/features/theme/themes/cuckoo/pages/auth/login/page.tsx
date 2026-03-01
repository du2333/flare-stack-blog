import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Github, Lock, Mail } from "lucide-react";
import { useState } from "react";
import type { LoginPageProps } from "@/features/theme/contract/pages";

export function LoginPage({
  isEmailConfigured,
  loginForm,
  socialLogin,
  turnstileElement,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold cuckoo-text-primary mb-2">
          欢迎回来
        </h1>
        <p className="cuckoo-text-secondary text-sm">登录以继续访问博客</p>
      </div>

      {/* Login Form */}
      {isEmailConfigured && (
        <form onSubmit={loginForm.handleSubmit} className="space-y-4">
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
                {...loginForm.register("email")}
                placeholder="请输入邮箱"
                className="cuckoo-input pl-10"
              />
            </div>
            {loginForm.errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {loginForm.errors.email.message}
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
                {...loginForm.register("password")}
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
            {loginForm.errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {loginForm.errors.password.message}
              </p>
            )}
          </div>

          {/* Turnstile */}
          {turnstileElement}

          {/* Error Message */}
          {loginForm.rootError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {loginForm.rootError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loginForm.isSubmitting || loginForm.loginStep === "SUCCESS"
            }
            className="w-full cuckoo-btn cuckoo-btn-primary py-3"
          >
            {loginForm.isSubmitting ? "登录中..." : "登录"}
          </button>
        </form>
      )}

      {/* Divider */}
      {isEmailConfigured && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--cuckoo-border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-900 px-2 cuckoo-text-muted">
              或使用以下方式登录
            </span>
          </div>
        </div>
      )}

      {/* GitHub Login */}
      <button
        onClick={socialLogin.handleGithubLogin}
        disabled={socialLogin.isLoading || socialLogin.turnstilePending}
        className="w-full cuckoo-btn cuckoo-btn-secondary py-3 gap-2"
      >
        <Github size={18} />
        <span>GitHub 登录</span>
      </button>

      {/* Footer Links */}
      <div className="text-center space-y-2">
        <Link
          to="/register"
          className="block text-sm cuckoo-text-secondary hover:cuckoo-primary transition-colors"
        >
          还没有账号？立即注册
        </Link>
        <Link
          to="/forgot-password"
          className="block text-sm cuckoo-text-muted hover:cuckoo-text-secondary transition-colors"
        >
          忘记密码？
        </Link>
      </div>
    </div>
  );
}
