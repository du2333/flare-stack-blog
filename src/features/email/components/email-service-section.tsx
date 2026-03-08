import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { EmailCredentialsPanel } from "./email-credentials-panel";
import { EmailDocPanel } from "./email-doc-panel";
import { EmailNotificationScope } from "./email-notification-scope";
import { EmailTestToolbar } from "./email-test-toolbar";
import type { SystemConfig } from "@/features/config/config.schema";
import type { Result } from "@/lib/errors";

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
      <EmailDocPanel />

      <div className="border border-border/30 bg-background/50 overflow-hidden divide-y divide-border/20">
        <EmailNotificationScope
          adminEmailEnabled={adminEmailEnabled}
          userEmailEnabled={userEmailEnabled}
          onToggleAdmin={(checked) =>
            setValue("notification.admin.channels.email", checked, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          onToggleUser={(checked) =>
            setValue("notification.user.emailEnabled", checked, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
        />

        <EmailCredentialsPanel<SystemConfig>
          register={register}
          showKey={showKey}
          apiKeyError={errors.email?.apiKey?.message}
          senderNameError={errors.email?.senderName?.message}
          senderAddressError={errors.email?.senderAddress?.message}
          onToggleKeyVisibility={() => setShowKey((prev) => !prev)}
          onFieldChange={() => setStatus("IDLE")}
        />

        <EmailTestToolbar
          status={status}
          isConfigured={isConfigured}
          onTest={handleTest}
        />
      </div>
    </div>
  );
}
