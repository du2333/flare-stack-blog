import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Terminal } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userHasPasswordFn } from "@/features/auth/auth.api";
import {
  getReplyNotificationStatusFn,
  toggleReplyNotificationFn,
} from "@/features/email/email.api";
import { AUTH_KEYS } from "@/features/auth/queries";
import { EMAIL_KEYS } from "@/features/email/queries";
import { authClient } from "@/lib/auth/auth.client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_user/profile")({
  component: ProfilePage,
  loader: async () => {
    return {
      title: "个人资料",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "需要当前密码"),
    newPassword: z.string().min(8, "新密码至少 8 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

const profileSchema = z.object({
  name: z.string().min(2, "昵称至少 2 位").max(20, "昵称最多 20 位"),
  image: z.union([z.literal(""), z.url("无效的 URL 地址").trim()]).optional(),
});

type PasswordSchema = z.infer<typeof passwordSchema>;
type ProfileSchema = z.infer<typeof profileSchema>;

function ProfilePage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordSchema>({
    resolver: standardSchemaResolver(passwordSchema),
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileSchema>({
    resolver: standardSchemaResolver(profileSchema),
    values: {
      name: user?.name || "",
      image: user?.image || "",
    },
  });

  const { data: hasPassword } = useQuery({
    queryKey: AUTH_KEYS.hasPassword(user?.id),
    queryFn: () => userHasPasswordFn(),
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const { data: notificationStatus, isLoading: isLoadingNotification } =
    useQuery({
      queryKey: EMAIL_KEYS.replyNotification(user?.id),
      queryFn: () => getReplyNotificationStatusFn(),
      enabled: !!user,
    });

  const toggleNotificationMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleReplyNotificationFn({ data: { enabled } }),
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(EMAIL_KEYS.replyNotification(user?.id), {
        enabled,
      });
      toast.success(enabled ? "已开启通知" : "已关闭通知");
    },
    onError: () => {
      toast.error("操作失败，请重试");
    },
  });

  const onPasswordSubmit = async (data: PasswordSchema) => {
    const { error } = await authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error("更新失败", {
        description: error.message,
      });
      return;
    }
    toast.success("密码已更新", {
      description: "你的安全设置已同步。",
    });
    resetPassword();
  };

  const onProfileSubmit = async (data: ProfileSchema) => {
    const { error } = await authClient.updateUser({
      name: data.name,
      image: data.image,
    });
    if (error) {
      toast.error("更新失败", {
        description: error.message,
      });
      return;
    }
    toast.success("资料已更新", {
      description: `昵称已更改为: ${data.name}`,
    });
  };

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("退出失败, 请稍后重试。", {
        description: error.message,
      });
      return;
    }
    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
    toast.success("已退出登录", {
      description: "期待再次相见。",
    });
    navigate({ to: "/" });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      {/* Header Section - Aligned with Homepage */}
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

      {/* Identity Section - Left Aligned */}
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

      {/* Settings Forms - Single Column Layout */}
      <div className="space-y-16">
        {/* Basic Info */}
        <section className="space-y-8">
          <h3 className="text-lg font-serif font-medium text-foreground">
            基本资料
          </h3>

          <form
            onSubmit={handleSubmitProfile(onProfileSubmit)}
            className="space-y-8"
          >
            <div className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                  昵称
                </label>
                <Input
                  {...registerProfile("name")}
                  className="bg-transparent border-0 border-b border-border text-foreground font-serif text-lg px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                />
                {profileErrors.name && (
                  <span className="text-[10px] text-destructive font-mono">
                    {profileErrors.name.message}
                  </span>
                )}
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                  头像链接
                </label>
                <Input
                  {...registerProfile("image")}
                  className="bg-transparent border-0 border-b border-border text-foreground font-mono text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  placeholder="https://..."
                />
                {profileErrors.image && (
                  <span className="text-[10px] text-destructive font-mono">
                    {profileErrors.image.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                type="submit"
                disabled={isProfileSubmitting}
                variant="ghost"
                className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto transition-colors"
              >
                {isProfileSubmitting ? (
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
              disabled={
                isLoadingNotification || toggleNotificationMutation.isPending
              }
              onClick={() =>
                toggleNotificationMutation.mutate(!notificationStatus?.enabled)
              }
              className={cn(
                "font-mono text-[10px] tracking-wider h-auto px-3 py-1 border transition-all rounded-full",
                notificationStatus?.enabled
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/50",
              )}
            >
              {notificationStatus?.enabled ? "已开启" : "已关闭"}
            </Button>
          </div>
        </section>

        {/* Security Section */}
        {hasPassword && (
          <>
            <div className="w-full h-px bg-border/40" />
            <section className="space-y-8">
              <h3 className="text-lg font-serif font-medium text-foreground">
                安全设置
              </h3>
              <form
                onSubmit={handleSubmitPassword(onPasswordSubmit)}
                className="space-y-6"
              >
                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    当前密码
                  </label>
                  <Input
                    type="password"
                    {...registerPassword("currentPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordErrors.currentPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordErrors.currentPassword.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    新密码
                  </label>
                  <Input
                    type="password"
                    {...registerPassword("newPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordErrors.newPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordErrors.newPassword.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
                    确认密码
                  </label>
                  <Input
                    type="password"
                    {...registerPassword("confirmPassword")}
                    className="bg-transparent border-0 border-b border-border text-foreground font-sans text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2"
                  />
                  {passwordErrors.confirmPassword && (
                    <span className="text-[10px] text-destructive font-mono">
                      {passwordErrors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <div className="flex justify-start pt-2">
                  <Button
                    type="submit"
                    disabled={isPasswordSubmitting}
                    variant="ghost"
                    className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto transition-colors"
                  >
                    {isPasswordSubmitting ? (
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
