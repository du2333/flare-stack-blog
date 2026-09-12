import type { CSSProperties } from "react";
import type { SiteConfig } from "@/features/config/site-config.schema";

export function getCuckooThemeStyle(siteConfig: SiteConfig): CSSProperties {
  return {
    "--cuckoo-hue": String(siteConfig.theme.cuckoo.primaryHue),
  } as CSSProperties;
}
