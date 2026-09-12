import { Link } from "@tanstack/react-router";
import { CodeSquare, Loader2, LogOut, Settings2, Shield } from "lucide-react";
import type { ProfilePageProps } from "@/features/theme/contract/pages";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function ProfilePage({
  user,
  profileForm,
  passwordForm,
  notification,
  logout,
}: ProfilePageProps) {
  const inputClassName =
    "w-full px-4 py-2.5 rounded-xl border border-(--cuckoo-input-border) bg-(--cuckoo-input-bg) focus:outline-none focus:ring-2 focus:ring-(--cuckoo-primary)/50 focus:border-transparent transition-all cuckoo-text-90 placeholder:text-black/30 dark:placeholder:text-white/30";
  const labelClassName =
    "block text-sm font-medium cuckoo-text-75 mb-1.5 transition-colors";

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      {/* Header Profile Section */}
      <div
        className="cuckoo-card-base p-8 md:p-10 relative overflow-hidden flex flex-col items-center justify-center cuckoo-onload-animation bg-linear-to-br from-(--cuckoo-primary)/5 to-transparent"
        style={{ animationDelay: "150ms" }}
      >
        <div
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-(--cuckoo-card-bg) bg-(--cuckoo-btn-regular-bg) shadow-md relative mb-4"
          style={{ viewTransitionName: "user-avatar" }}
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-(--cuckoo-btn-content) font-bold text-3xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold cuckoo-text-90 mb-2 transition-colors">
          {user.name}
        </h1>
        <div className="flex items-center gap-2 text-(--cuckoo-btn-content) text-sm font-medium transition-colors">
          <span>{user.email}</span>
          <span className="w-1 h-1 rounded-full bg-(--cuckoo-meta-divider)" />
          <span className="uppercase tracking-wider text-xs px-2 py-0.5 rounded-md bg-(--cuckoo-btn-regular-bg)">
            {user.role === "admin"
              ? m.profile_role_admin()
              : m.profile_role_reader()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div
            className="cuckoo-card-base p-6 md:p-8 cuckoo-onload-animation flex flex-col gap-6"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-3 pb-4 border-b border-(--cuckoo-btn-regular-bg)">
              <div className="w-10 h-10 rounded-xl bg-(--cuckoo-btn-regular-bg) text-(--cuckoo-btn-content) flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold cuckoo-text-90">
                {m.profile_basic_settings()}
              </h2>
            </div>

            <form onSubmit={profileForm.handleSubmit} className="space-y-6">
              <div>
                <label className={labelClassName}>{m.profile_name()}</label>
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
                <label className={labelClassName}>
                  {m.profile_avatar_url()}
                </label>
                <input
                  {...profileForm.register("image")}
                  placeholder={m.profile_avatar_url_placeholder()}
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
                  className="cuckoo-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center justify-center min-w-32 gap-2 active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                  {profileForm.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {m.profile_save_changes()}
                </button>
              </div>
            </form>
          </div>

          {/* Security Document section if form is available */}
          {passwordForm && (
            <div
              className="cuckoo-card-base p-6 md:p-8 cuckoo-onload-animation flex flex-col gap-6"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-(--cuckoo-btn-regular-bg)">
                <div className="w-10 h-10 rounded-xl bg-(--cuckoo-btn-regular-bg) text-(--cuckoo-btn-content) flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold cuckoo-text-90">
                  {m.profile_password_security()}
                </h2>
              </div>

              <form onSubmit={passwordForm.handleSubmit} className="space-y-6">
                <div>
                  <label className={labelClassName}>
                    {m.profile_current_password()}
                  </label>
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
                  <label className={labelClassName}>
                    {m.profile_new_password()}
                  </label>
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
                  <label className={labelClassName}>
                    {m.profile_confirm_password()}
                  </label>
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
                    className="cuckoo-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center justify-center min-w-32 gap-2 active:scale-95 transition-all text-sm disabled:opacity-50"
                  >
                    {passwordForm.isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {m.profile_update_password()}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Mini Widgets like Mail Prefs & Actions */}
        <div className="flex flex-col gap-6">
          {notification.available && (
            <div
              className="cuckoo-card-base p-6 cuckoo-onload-animation flex flex-col gap-6"
              style={{ animationDelay: "250ms" }}
            >
              <h3 className="text-lg font-bold cuckoo-text-90 border-b border-(--cuckoo-btn-regular-bg) pb-3">
                {m.profile_preferences()}
              </h3>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold cuckoo-text-75">
                  {m.profile_email_notify()}
                </span>
                <p className="text-xs text-(--cuckoo-btn-content) mb-2">
                  {m.profile_email_notify_desc()}
                </p>
                <button
                  disabled={notification.isLoading || notification.isPending}
                  onClick={notification.toggle}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95",
                    notification.enabled
                      ? "cuckoo-btn-primary"
                      : "cuckoo-btn-regular",
                  )}
                >
                  {notification.isLoading || notification.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>
                      {notification.enabled
                        ? m.profile_notify_enabled()
                        : m.profile_notify_disabled()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          <div
            className="cuckoo-card-base p-6 cuckoo-onload-animation flex flex-col gap-3"
            style={{ animationDelay: "350ms" }}
          >
            <h3 className="text-lg font-bold cuckoo-text-90 border-b border-(--cuckoo-btn-regular-bg) pb-3 mb-2">
              {m.profile_actions()}
            </h3>

            {user.role === "admin" && (
              <Link
                to="/admin"
                className="w-full cuckoo-btn-regular py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
              >
                <CodeSquare className="w-4 h-4" />
                {m.profile_admin_dashboard()}
              </Link>
            )}

            <button
              onClick={logout}
              className="w-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
            >
              <LogOut className="w-4 h-4" />
              {m.profile_logout()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
