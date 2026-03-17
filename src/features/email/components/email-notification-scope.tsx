import { Checkbox } from "@/components/ui/checkbox";
import { m } from "@/paraglide/messages";

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
      <h5 className="text-sm font-medium text-foreground">
        {m.settings_email_scope_title()}
      </h5>
      <div className="grid gap-4 xl:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox
            checked={adminEmailEnabled}
            onCheckedChange={onToggleAdmin}
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {m.settings_email_scope_admin_label()}
            </p>
            <p className="break-all text-sm text-muted-foreground">
              {m.settings_email_scope_admin_desc()}
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-4 border border-border/20 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
          <Checkbox checked={userEmailEnabled} onCheckedChange={onToggleUser} />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {m.settings_email_scope_user_label()}
            </p>
            <p className="break-all text-sm text-muted-foreground">
              {m.settings_email_scope_user_desc()}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
