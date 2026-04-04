import { Eye, EyeOff, Globe, Lock } from "lucide-react";
import type { FieldPath, FieldValues, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

interface EmailCredentialsPanelProps<TFieldValues extends FieldValues> {
  register: UseFormRegister<TFieldValues>;
  showPassword: boolean;
  hostError?: string;
  portError?: string;
  usernameError?: string;
  passwordError?: string;
  senderNameError?: string;
  senderAddressError?: string;
  onTogglePasswordVisibility: () => void;
  onFieldChange: () => void;
}

export function EmailCredentialsPanel<TFieldValues extends FieldValues>({
  register,
  showPassword,
  hostError,
  portError,
  usernameError,
  passwordError,
  senderNameError,
  senderAddressError,
  onTogglePasswordVisibility,
  onFieldChange,
}: EmailCredentialsPanelProps<TFieldValues>) {
  return (
    <>
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-sm bg-muted/40 p-2">
              <Lock size={16} className="text-muted-foreground" />
            </div>
            <h5 className="text-sm font-medium text-foreground">
              {m.settings_email_creds_server_title()}
            </h5>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-16 gap-y-10 px-2 xl:grid-cols-2">
          <div className="space-y-4">
            <label
              htmlFor="email-host"
              className="text-sm text-muted-foreground"
            >
              {m.settings_email_creds_host_label()}
            </label>
            <Input
              id="email-host"
              {...register("email.host" as FieldPath<TFieldValues>, {
                onChange: onFieldChange,
              })}
              placeholder={m.settings_email_creds_host_ph()}
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm text-foreground transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
            />
            {hostError && <p className="text-xs text-red-500">! {hostError}</p>}
          </div>

          <div className="space-y-4">
            <label
              htmlFor="email-port"
              className="text-sm text-muted-foreground"
            >
              {m.settings_email_creds_port_label()}
            </label>
            <Input
              id="email-port"
              type="number"
              {...register("email.port" as FieldPath<TFieldValues>, {
                onChange: onFieldChange,
                valueAsNumber: true,
              })}
              placeholder={m.settings_email_creds_port_ph()}
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm text-foreground transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
            />
            {portError && <p className="text-xs text-red-500">! {portError}</p>}
          </div>

          <div className="space-y-4">
            <label
              htmlFor="email-username"
              className="text-sm text-muted-foreground"
            >
              {m.settings_email_creds_username_label()}
            </label>
            <Input
              id="email-username"
              {...register("email.username" as FieldPath<TFieldValues>, {
                onChange: onFieldChange,
              })}
              placeholder={m.settings_email_creds_username_ph()}
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm text-foreground transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
            />
            {usernameError && (
              <p className="text-xs text-red-500">! {usernameError}</p>
            )}
          </div>

          <div className="space-y-4">
            <label
              htmlFor="email-password"
              className="text-sm text-muted-foreground"
            >
              {m.settings_email_creds_password_label()}
            </label>
            <div className="relative group/input">
              <Input
                id="email-password"
                type={showPassword ? "text" : "password"}
                {...register("email.password" as FieldPath<TFieldValues>, {
                  onChange: onFieldChange,
                })}
                placeholder={m.settings_email_creds_password_ph()}
                className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 pr-12 text-sm text-foreground transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onTogglePasswordVisibility}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-none text-muted-foreground/30 transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </Button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-500">! {passwordError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 p-8">
        <div className="flex items-center gap-4">
          <div className="rounded-sm bg-muted/40 p-2">
            <Globe size={16} className="text-muted-foreground" />
          </div>
          <h5 className="text-sm font-medium text-foreground">
            {m.settings_email_creds_info_title()}
          </h5>
        </div>

        <div className="grid grid-cols-1 gap-x-16 gap-y-10 px-2 xl:grid-cols-2">
          <div className="space-y-4">
            <label className="text-sm text-muted-foreground">
              {m.settings_email_creds_sender_name_label()}
            </label>
            <Input
              {...register("email.senderName" as FieldPath<TFieldValues>, {
                onChange: onFieldChange,
              })}
              placeholder={m.settings_email_creds_sender_name_ph()}
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
            />
            {senderNameError && (
              <p className="text-xs text-red-500">! {senderNameError}</p>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm text-muted-foreground">
              {m.settings_email_creds_sender_addr_label()}
            </label>
            <Input
              type="email"
              {...register("email.senderAddress" as FieldPath<TFieldValues>, {
                onChange: onFieldChange,
              })}
              placeholder={m.settings_email_creds_sender_addr_ph()}
              className="w-full rounded-none border border-border/30 bg-muted/10 px-4 py-6 text-sm transition-all focus-visible:border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/10"
            />
            {senderAddressError && (
              <p className="text-xs text-red-500">! {senderAddressError}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
