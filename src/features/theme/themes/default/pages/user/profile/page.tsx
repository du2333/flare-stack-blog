import { Link } from "@tanstack/react-router";
import { Loader2, Terminal } from "lucide-react";
import type { ProfilePageProps } from "@/features/theme/contract/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProfilePage({
  user,
  profileForm,
  passwordForm,
  notification,
  logout,
}: ProfilePageProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      {/* Header Section */}
      <header className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground flex items-center gap-4">
              个人设置
            </h1>
            <div className="space-y-4 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
              <p>管理你的个人信息与偏好设置。</p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Terminal size={14} />
              cd /home
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full h-px bg-border/40" />

      {/* Identity Section */}
      <section className="flex items-center gap-8">
        <div
          className="w-24 h-24 rounded-full overflow-hidden border border-border bg-muted/30 relative"
          style={{ viewTransitionName: "user-avatar" }}
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif text-3xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-serif text-foreground tracking-tight">
            {user.name}
          </h2>
          <div className="flex flex-col gap-1 text-xs font-mono text-muted-foreground/60 tracking-widest">
            <span className="uppercase">
              {user.role === "admin" ? "管理员" : "读者"}
            </span>
            <span>{user.email}</span>
          </div>
        </div>
      </section>

      {/* Settings Forms */}
      <div className="space-y-16">
        {/* Basic Info */}
        <section className="space-y-8">
          <h3 className="text-lg font-serif font-medium text-foreground">
            基本资料
          </h3>

          <form onSubmit={profileForm.handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                  昵称
                </label>
                <Input
                  {...profileForm.register("name")}
                  className="bg-transparent border-0 border-b border-border text-foreground font-serif text-lg px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                />
                {profileForm.errors.name && (
                  <span className="text-[10px] text-destructive font-mono">
                    {profileForm.errors.name.message}
                  </span>
                )}
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                  头像链接
                </label>
                <Input
                  {...profileForm.register("image")}
                  className="bg-transparent border-0 border-b border-border text-foreground font-mono text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  placeholder="https://..."
                />
                {profileForm.errors.image && (
                  <span className="text-[10px] text-destructive font-mono">
                    {profileForm.errors.image.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                type="submit"
                disabled={profileForm.isSubmitting}
                variant="ghost"
                className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto transition-colors"
              >
                {profileForm.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> 保存中...
                  </span>
                ) : (
                  "[ 保存更改 ]"
                )}
              </Button>
            </div>
          </form>
        </section>

        <div className="w-full h-px bg-border/40" />

        {/* Notifications */}
        <section className="space-y-8">
          <h3 className="text-lg font-serif font-medium text-foreground">
            偏好设置
          </h3>
          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <div className="space-y-1">
              <span className="text-sm font-sans text-foreground">
                邮件通知
              </span>
              <span className="text-[10px] font-mono text-muted-foreground block">
                当收到回复时通知我
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={notification.isLoading || notification.isPending}
              onClick={notification.toggle}
              className={cn(
                "font-mono text-[10px] tracking-wider h-auto px-3 py-1 border transition-all rounded-full",
                notification.enabled
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/50",
              )}
            >
              {notification.enabled ? "已开启" : "已关闭"}
            </Button>
          </div>
        </section>

        {/* Security Section */}
        {passwordForm && (
          <>
            <div className="w-full h-px bg-border/40" />
            <section className="space-y-8">
              <h3 className="text-lg font-serif font-medium text-foreground">
                安全设置
              </h3>
              <form onSubmit={passwordForm.handleSubmit} className="space-y-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    当前密码
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordForm.errors.currentPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordForm.errors.currentPassword.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    新密码
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("newPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordForm.errors.newPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordForm.errors.newPassword.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    确认密码
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordForm.errors.confirmPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordForm.errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <div className="flex justify-start pt-2">
                  <Button
                    type="submit"
                    disabled={passwordForm.isSubmitting}
                    variant="ghost"
                    className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    {passwordForm.isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" /> 更新中...
                      </span>
                    ) : (
                      "[ 更新密码 ]"
                    )}
                  </Button>
                </div>
              </form>
            </section>
          </>
        )}

        <div className="w-full h-px bg-border/40" />

        {/* Action Links */}
        <section className="flex flex-col items-start gap-4">
          {user.role === "admin" && (
            <Link
              to="/admin"
              className="font-mono text-xs text-foreground/60 hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-2"
            >
              <span>[ 进入管理后台 ]</span>
            </Link>
          )}
          <Button
            variant="ghost"
            onClick={logout}
            className="font-mono text-xs text-destructive/60 hover:text-destructive hover:bg-transparent p-0 h-auto transition-colors tracking-widest"
          >
            [ 退出登录 ]
          </Button>
        </section>
      </div>
    </div>
  );
}
