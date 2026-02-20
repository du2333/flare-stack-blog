import { Link } from "@tanstack/react-router";
import { CodeSquare, Loader2, LogOut, Settings2, Shield } from "lucide-react";
import type { ProfilePageProps } from "@/features/theme/contract/pages";
import { cn } from "@/lib/utils";

export function ProfilePage({
  user,
  profileForm,
  passwordForm,
  notification,
  logout,
}: ProfilePageProps) {
  const inputClassName =
    "w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all fuwari-text-90 placeholder:text-black/30 dark:placeholder:text-white/30";
  const labelClassName =
    "block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors";

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      {/* Header Profile Section */}
      <div
        className="fuwari-card-base p-8 md:p-10 relative overflow-hidden flex flex-col items-center justify-center fuwari-onload-animation bg-linear-to-br from-(--fuwari-primary)/5 to-transparent"
        style={{ animationDelay: "150ms" }}
      >
        <div
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-(--fuwari-card-bg) bg-(--fuwari-btn-regular-bg) shadow-md relative mb-4"
          style={{ viewTransitionName: "user-avatar" }}
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-(--fuwari-btn-content) font-bold text-3xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold fuwari-text-90 mb-2 transition-colors">
          {user.name}
        </h1>
        <div className="flex items-center gap-2 text-(--fuwari-btn-content) text-sm font-medium transition-colors">
          <span>{user.email}</span>
          <span className="w-1 h-1 rounded-full bg-(--fuwari-meta-divider)" />
          <span className="uppercase tracking-wider text-xs px-2 py-0.5 rounded-md bg-(--fuwari-btn-regular-bg)">
            {user.role === "admin" ? "管理员" : "读者"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div
            className="fuwari-card-base p-6 md:p-8 fuwari-onload-animation flex flex-col gap-6"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-3 pb-4 border-b border-(--fuwari-btn-regular-bg)">
              <div className="w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold fuwari-text-90">基本设置</h2>
            </div>

            <form onSubmit={profileForm.handleSubmit} className="space-y-6">
              <div>
                <label className={labelClassName}>昵称</label>
                <input
                  {...profileForm.register("name")}
                  className={inputClassName}
                />
                {profileForm.errors.name && (
                  <span className="text-sm text-red-500 font-medium ml-1 mt-1 block">
                    {profileForm.errors.name.message}
                  </span>
                )}
              </div>

              <div>
                <label className={labelClassName}>头像链接</label>
                <input
                  {...profileForm.register("image")}
                  placeholder="https://..."
                  className={inputClassName}
                />
                {profileForm.errors.image && (
                  <span className="text-sm text-red-500 font-medium ml-1 mt-1 block">
                    {profileForm.errors.image.message}
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileForm.isSubmitting}
                  className="fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center justify-center min-w-32 gap-2 active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                  {profileForm.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  保存更改
                </button>
              </div>
            </form>
          </div>

          {/* Security Document section if form is available */}
          {passwordForm && (
            <div
              className="fuwari-card-base p-6 md:p-8 fuwari-onload-animation flex flex-col gap-6"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-(--fuwari-btn-regular-bg)">
                <div className="w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold fuwari-text-90">密码安全</h2>
              </div>

              <form onSubmit={passwordForm.handleSubmit} className="space-y-6">
                <div>
                  <label className={labelClassName}>当前密码</label>
                  <input
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    className={inputClassName}
                  />
                  {passwordForm.errors.currentPassword && (
                    <span className="text-sm text-red-500 font-medium ml-1 mt-1 block">
                      {passwordForm.errors.currentPassword.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className={labelClassName}>新密码</label>
                  <input
                    type="password"
                    {...passwordForm.register("newPassword")}
                    className={inputClassName}
                  />
                  {passwordForm.errors.newPassword && (
                    <span className="text-sm text-red-500 font-medium ml-1 mt-1 block">
                      {passwordForm.errors.newPassword.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className={labelClassName}>确认密码</label>
                  <input
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    className={inputClassName}
                  />
                  {passwordForm.errors.confirmPassword && (
                    <span className="text-sm text-red-500 font-medium ml-1 mt-1 block">
                      {passwordForm.errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordForm.isSubmitting}
                    className="fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center justify-center min-w-32 gap-2 active:scale-95 transition-all text-sm disabled:opacity-50"
                  >
                    {passwordForm.isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    更新密码
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Mini Widgets like Mail Prefs & Actions */}
        <div className="flex flex-col gap-6">
          <div
            className="fuwari-card-base p-6 fuwari-onload-animation flex flex-col gap-6"
            style={{ animationDelay: "250ms" }}
          >
            <h3 className="text-lg font-bold fuwari-text-90 border-b border-(--fuwari-btn-regular-bg) pb-3">
              偏好
            </h3>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold fuwari-text-75">邮件提醒</span>
              <p className="text-xs text-(--fuwari-btn-content) mb-2">
                当您收到他人的回复或评论时，将发送邮件通知。
              </p>
              <button
                disabled={notification.isLoading || notification.isPending}
                onClick={notification.toggle}
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95",
                  notification.enabled
                    ? "fuwari-btn-primary"
                    : "fuwari-btn-regular",
                )}
              >
                {notification.isLoading || notification.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>
                    {notification.enabled ? "已开启通知" : "未开启通知"}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div
            className="fuwari-card-base p-6 fuwari-onload-animation flex flex-col gap-3"
            style={{ animationDelay: "350ms" }}
          >
            <h3 className="text-lg font-bold fuwari-text-90 border-b border-(--fuwari-btn-regular-bg) pb-3 mb-2">
              操作
            </h3>

            {user.role === "admin" && (
              <Link
                to="/admin"
                className="w-full fuwari-btn-regular py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
              >
                <CodeSquare className="w-4 h-4" />
                管理后台
              </Link>
            )}

            <button
              onClick={logout}
              className="w-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
