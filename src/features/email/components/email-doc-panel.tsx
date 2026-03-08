import { Info } from "lucide-react";

export function EmailDocPanel() {
  return (
    <div className="group relative overflow-hidden border border-border/30 bg-muted/5 p-8 transition-all hover:bg-muted/10">
      <div className="relative z-10 flex items-start gap-6">
        <div className="rounded-full bg-foreground/5 p-3">
          <Info className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">使用说明</h4>
          <div className="grid grid-cols-1 gap-x-12 gap-y-3 xl:grid-cols-2">
            <EmailDocTip index="1">
              邮件服务是用户注册验证及密码重置的核心组件。
            </EmailDocTip>
            <EmailDocTip index="2">
              若不配置，系统将仅支持 GitHub 等第三方 OAuth 登录。
            </EmailDocTip>
            <EmailDocTip index="3">
              Resend 需完成域名验证 (DNS)，否则仅能发送至注册邮箱。
            </EmailDocTip>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailDocTip({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-mono text-muted-foreground">
        {index}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
