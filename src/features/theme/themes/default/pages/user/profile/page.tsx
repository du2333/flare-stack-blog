import { Link } from "@tanstack/react-router";
import { Loader2, Terminal, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ProfilePageProps } from "@/features/theme/contract/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AVATAR_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const AVATAR_MAX_SIZE = 3 * 1024 * 1024; // 3MB

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
        <div className="relative group">
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
          <AvatarUploadOverlay
            isUploading={profileForm.isUploadingAvatar}
            onUpload={profileForm.uploadAvatar}
          />
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
                  头像
                </label>
                <AvatarDropZone
                  currentImage={user.image}
                  userName={user.name}
                  isUploading={profileForm.isUploadingAvatar}
                  onUpload={profileForm.uploadAvatar}
                />
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

// ─── Avatar upload helpers ──────────────────────────────

function handleAvatarFile(
  file: File | undefined,
  onUpload: (file: File) => Promise<void>,
) {
  if (!file) return;
  if (file.size > AVATAR_MAX_SIZE) {
    toast.error("文件过大", { description: "头像文件不能超过 3MB" });
    return;
  }
  void onUpload(file);
}

function AvatarUploadOverlay({
  isUploading,
  onUpload,
}: {
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleAvatarFile(e.target.files?.[0], onUpload);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer disabled:cursor-wait"
      >
        {isUploading ? (
          <Loader2 size={20} className="text-white animate-spin" />
        ) : (
          <Upload size={20} className="text-white" />
        )}
      </button>
    </>
  );
}

function AvatarDropZone({
  currentImage,
  userName,
  isUploading,
  onUpload,
}: {
  currentImage?: string | null;
  userName: string;
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleAvatarFile(file, onUpload);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex items-center gap-4 border border-dashed p-4 cursor-pointer transition-all duration-200",
        isDragging
          ? "border-foreground bg-accent/10"
          : "border-border/50 hover:border-foreground/40 hover:bg-accent/5",
        isUploading && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleAvatarFile(e.target.files?.[0], onUpload);
          e.target.value = "";
        }}
      />

      {/* Preview */}
      <div className="w-16 h-16 rounded-full overflow-hidden border border-border/30 bg-muted/20 shrink-0">
        {currentImage ? (
          <img src={currentImage} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif text-xl">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1 min-w-0">
        {isUploading ? (
          <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> 上传中...
          </span>
        ) : (
          <>
            <span className="text-xs font-mono text-foreground/80">
              {isDragging ? "松开鼠标上传" : "点击选择或拖拽文件至此"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              JPG / PNG / WebP · 最大 3MB
            </span>
          </>
        )}
      </div>

      {/* Upload Icon */}
      <div className="ml-auto shrink-0 text-muted-foreground/30">
        <Upload size={16} />
      </div>
    </div>
  );
}
