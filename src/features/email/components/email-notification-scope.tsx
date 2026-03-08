import { Checkbox } from "@/components/ui/checkbox";

interface EmailNotificationScopeProps {
  adminEmailEnabled: boolean;
  userEmailEnabled: boolean;
  onToggleAdmin: (checked: boolean) => void;
  onToggleUser: (checked: boolean) => void;
}

export function EmailNotificationScope({
  adminEmailEnabled,
  userEmailEnabled,
  onToggleAdmin,
  onToggleUser,
}: EmailNotificationScopeProps) {
  return (
    <div className="space-y-6 p-8">
      <h5 className="text-sm font-medium text-foreground">通知范围</h5>
      <div className="grid gap-4 xl:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox
            checked={adminEmailEnabled}
            onCheckedChange={onToggleAdmin}
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              管理员邮件通知
            </p>
            <p className="break-all text-sm text-muted-foreground">
              新评论、待审核评论和友链申请会发送到管理员邮箱。
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox checked={userEmailEnabled} onCheckedChange={onToggleUser} />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">用户邮件通知</p>
            <p className="break-all text-sm text-muted-foreground">
              回复提醒和友链审核结果会发送给用户；关闭后资料页不再显示通知开关。
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
