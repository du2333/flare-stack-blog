import { createContext, useContext } from "react";
import type { AdminConfigSnapshot } from "../../config.admin.schema";
import type { SystemConfig } from "../../config.schema";
export type ConfigFormValues = SystemConfig & {
  clearEmailPassword: boolean;
  clearWebhookSecret: boolean;
};
export const ConfigEditingContext = createContext<
  Pick<AdminConfigSnapshot, "secrets" | "revisions"> & {
    dirtySections?: { site: boolean; notifications: boolean };
  }
>({
  secrets: { emailPasswordConfigured: false, webhookSecretConfigured: false },
  revisions: { site: 0, notifications: 0 },
});
export const useConfigEditing = () => useContext(ConfigEditingContext);
