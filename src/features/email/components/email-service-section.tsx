import { Eye, EyeOff, Globe, Info, Loader2, Lock, Wifi } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { SystemConfig } from "@/features/config/config.schema";
import type { Result } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type ConnectionStatus = "IDLE" | "TESTING" | "SUCCESS" | "ERROR";

interface EmailSectionProps {
  testEmailConnection: (options: {
    data: {
      apiKey: string;
      senderAddress: string;
      senderName?: string;
    };
  }) => Promise<
    Result<{ success: boolean }, { reason: "SEND_FAILED"; message: string }>
  >;
}

export function EmailServiceSection({
  testEmailConnection,
}: EmailSectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("IDLE");

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SystemConfig>();

  const emailConfig = watch("email");
  const adminEmailEnabled = watch("notification.admin.channels.email") ?? true;
  const userEmailEnabled = watch("notification.user.emailEnabled") ?? true;
  // Check if configured: need apiKey and senderAddress
  const isConfigured =
    !!emailConfig?.apiKey?.trim() && !!emailConfig.senderAddress?.trim();

  const handleTest = async () => {
    if (!isConfigured) return;
    setStatus("TESTING");

    try {
      const result = await testEmailConnection({
        data: {
          apiKey: emailConfig?.apiKey || "",
          senderAddress: emailConfig?.senderAddress || "",
          senderName: emailConfig?.senderName,
        },
      });

      if (!result.error) {
        setStatus("SUCCESS");
      } else {
        setStatus("ERROR");
      }
    } catch {
      setStatus("ERROR");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="group relative border border-border/30 bg-muted/5 p-8 overflow-hidden transition-all hover:bg-muted/10">
        <div className="flex gap-6 items-start relative z-10">
          <div className="p-3 bg-foreground/5 rounded-full">
            <Info className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">使用说明</h4>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  1
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  邮件服务是用户注册验证及密码重置的核心组件。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  2
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  若不配置，系统将仅支持 GitHub 等第三方 OAuth 登录。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
                  3
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Resend 需完成域名验证 (DNS)，否则仅能发送至注册邮箱。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border/30 bg-background/50 overflow-hidden divide-y divide-border/20">
        <div className="p-8 space-y-6">
          <h5 className="text-sm font-medium text-foreground">通知范围</h5>
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="flex items-start gap-3 border border-border/20 bg-muted/10 p-4">
              <Checkbox
                checked={adminEmailEnabled}
                onCheckedChange={(checked) =>
                  setValue("notification.admin.channels.email", checked, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  管理员邮件通知
                </p>
                <p className="text-sm text-muted-foreground">
                  新评论、待审核评论和友链申请会发送到管理员邮箱。
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 border border-border/20 bg-muted/10 p-4">
              <Checkbox
                checked={userEmailEnabled}
                onCheckedChange={(checked) =>
                  setValue("notification.user.emailEnabled", checked, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  用户邮件通知
                </p>
                <p className="text-sm text-muted-foreground">
                  回复提醒和友链审核结果会发送给用户；关闭后资料页不再显示通知开关。
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted/40 rounded-sm">
                <Lock size={16} className="text-muted-foreground" />
              </div>
              <h5 className="text-sm font-medium text-foreground">API Key</h5>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl px-2">
            <label className="text-sm text-muted-foreground">
              Resend API Key
            </label>
            <div className="relative group/input">
              <Input
                type={showKey ? "text" : "password"}
                {...register("email.apiKey", {
                  onChange: () => setStatus("IDLE"),
                })}
                placeholder="re_xxxxxxxxxxxxxx，留空则不启用邮件发送"
                className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-foreground/10 focus:border-border/60 transition-all px-4 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground transition-colors h-8 w-8 rounded-none"
              >
                {showKey ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </Button>
            </div>
            {errors.email?.apiKey && (
              <p className="text-xs text-red-500">
                ! {errors.email.apiKey.message}
              </p>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-muted/40 rounded-sm">
              <Globe size={16} className="text-muted-foreground" />
            </div>
            <h5 className="text-sm font-medium text-foreground">发信信息</h5>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-16 gap-y-10 px-2">
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">发信名称</label>
              <Input
                {...register("email.senderName", {
                  onChange: () => setStatus("IDLE"),
                })}
                placeholder="例如：Chronicle Blog"
                className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm focus-visible:ring-1 focus-visible:ring-foreground/10 focus:border-border/60 transition-all px-4"
              />
              {errors.email?.senderName && (
                <p className="text-xs text-red-500">
                  ! {errors.email.senderName.message}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">发信邮箱</label>
              <Input
                type="email"
                {...register("email.senderAddress", {
                  onChange: () => setStatus("IDLE"),
                })}
                placeholder="noreply@yourdomain.com"
                className="w-full bg-muted/10 border border-border/30 rounded-none py-6 text-sm focus-visible:ring-1 focus-visible:ring-foreground/10 focus:border-border/60 transition-all px-4"
              />
              {errors.email?.senderAddress && (
                <p className="text-xs text-red-500">
                  ! {errors.email.senderAddress.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-muted/10 p-6 px-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-700 ${
                  status === "SUCCESS"
                    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : status === "ERROR"
                      ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                      : status === "TESTING"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-muted-foreground/20"
                }`}
              />
              <span className="text-sm font-serif font-medium text-foreground">
                {status === "SUCCESS"
                  ? "服务连接正常"
                  : status === "ERROR"
                    ? "连接测试失败"
                    : status === "TESTING"
                      ? "正在测试连接..."
                      : "等待测试连接"}
              </span>
            </div>

            <span className="hidden md:block w-px h-4 bg-border/30" />

            <p className="hidden md:block text-xs text-muted-foreground">
              {status === "IDLE"
                ? "填写完成后可发送测试邮件"
                : `当前状态：${status}`}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={status === "TESTING" || !isConfigured}
            className={`h-10 px-8 rounded-none text-[10px] font-mono uppercase tracking-[0.2em] transition-all border-border/50 hover:bg-background ${
              !isConfigured
                ? "opacity-30 cursor-not-allowed"
                : "text-foreground"
            }`}
          >
            {status === "TESTING" ? (
              <Loader2 size={12} className="animate-spin mr-3" />
            ) : (
              <Wifi size={12} className="mr-3" />
            )}
            {status === "TESTING" ? "测试中..." : "发送测试邮件"}
          </Button>
        </div>
      </div>
    </div>
  );
}
