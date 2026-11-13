import { z } from "zod";

/** The tabs the old Settings address named; `LEGACY_SETTINGS_TAB_TO` leads each to its page. */
export const LEGACY_SETTINGS_TABS = [
  "site",
  "email",
  "webhook",
  "api-keys",
  "maintenance",
] as const;

/** `?tab=` of the old Settings address, which now leads to one page per tab. */
export const legacySettingsSearchSchema = z.object({
  tab: z.enum(LEGACY_SETTINGS_TABS).optional(),
});
