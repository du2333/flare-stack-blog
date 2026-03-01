import { useState } from "react";
import { Bell, Lock, LogOut, User } from "lucide-react";
import type { ProfilePageProps } from "@/features/theme/contract/pages";

export function ProfilePage({
  user,
  profileForm,
  passwordForm,
  notification,
  logout,
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "notification"
  >("profile");

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="cuckoo-card p-6 text-center">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-[var(--cuckoo-primary)]"
          />
        ) : (
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-[var(--cuckoo-primary)]/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-[var(--cuckoo-primary)]">
              {user.name[0]}
            </span>
          </div>
        )}
        <h1 className="text-xl font-bold cuckoo-text-primary">{user.name}</h1>
        <p className="cuckoo-text-muted text-sm">{user.email}</p>
        {user.role && (
          <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-[var(--cuckoo-primary)]/10 text-[var(--cuckoo-primary)]">
            {user.role === "admin" ? "管理员" : "普通会员"}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="cuckoo-card p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
              activeTab === "profile"
                ? "bg-[var(--cuckoo-primary)] text-white"
                : "cuckoo-text-secondary hover:bg-[var(--cuckoo-card-bg-hover)]"
            }`}
          >
            <User size={16} />
            <span>个人资料</span>
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
              activeTab === "password"
                ? "bg-[var(--cuckoo-primary)] text-white"
                : "cuckoo-text-secondary hover:bg-[var(--cuckoo-card-bg-hover)]"
            }`}
          >
            <Lock size={16} />
            <span>修改密码</span>
          </button>
          <button
            onClick={() => setActiveTab("notification")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
              activeTab === "notification"
                ? "bg-[var(--cuckoo-primary)] text-white"
                : "cuckoo-text-secondary hover:bg-[var(--cuckoo-card-bg-hover)]"
            }`}
          >
            <Bell size={16} />
            <span>通知设置</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <div className="cuckoo-card p-6">
          <h2 className="text-lg font-bold cuckoo-text-primary mb-4">
            个人资料
          </h2>
          <form onSubmit={profileForm.handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
                昵称
              </label>
              <input
                type="text"
                {...profileForm.register("name")}
                className="cuckoo-input"
              />
              {profileForm.errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {profileForm.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
                头像 URL
              </label>
              <input
                type="url"
                {...profileForm.register("image")}
                className="cuckoo-input"
                placeholder="https://example.com/avatar.jpg"
              />
              {profileForm.errors.image && (
                <p className="text-red-500 text-xs mt-1">
                  {profileForm.errors.image.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={profileForm.isSubmitting}
              className="w-full cuckoo-btn cuckoo-btn-primary py-2.5"
            >
              {profileForm.isSubmitting ? "保存中..." : "保存修改"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "password" && passwordForm && (
        <div className="cuckoo-card p-6">
          <h2 className="text-lg font-bold cuckoo-text-primary mb-4">
            修改密码
          </h2>
          <form onSubmit={passwordForm.handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
                当前密码
              </label>
              <input
                type="password"
                {...passwordForm.register("currentPassword")}
                className="cuckoo-input"
              />
              {passwordForm.errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {passwordForm.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
                新密码
              </label>
              <input
                type="password"
                {...passwordForm.register("newPassword")}
                className="cuckoo-input"
              />
              {passwordForm.errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {passwordForm.errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
                确认新密码
              </label>
              <input
                type="password"
                {...passwordForm.register("confirmPassword")}
                className="cuckoo-input"
              />
              {passwordForm.errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {passwordForm.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordForm.isSubmitting}
              className="w-full cuckoo-btn cuckoo-btn-primary py-2.5"
            >
              {passwordForm.isSubmitting ? "修改中..." : "修改密码"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "notification" && (
        <div className="cuckoo-card p-6">
          <h2 className="text-lg font-bold cuckoo-text-primary mb-4">
            通知设置
          </h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--cuckoo-card-bg-hover)]">
            <div className="flex items-center gap-3">
              <Bell className="cuckoo-text-secondary" size={20} />
              <div>
                <p className="font-medium cuckoo-text-primary">邮件通知</p>
                <p className="text-sm cuckoo-text-muted">
                  接收博客更新和评论通知
                </p>
              </div>
            </div>
            <button
              onClick={notification.toggle}
              disabled={notification.isLoading}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notification.enabled
                  ? "bg-[var(--cuckoo-primary)]"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  notification.enabled ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={logout}
        className="w-full cuckoo-btn cuckoo-btn-secondary py-3 gap-2"
      >
        <LogOut size={16} />
        <span>退出登录</span>
      </button>
    </div>
  );
}
