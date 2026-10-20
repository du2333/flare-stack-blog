import type { CSSProperties } from "react";
import type { SiteConfig } from "@/features/config/site-config.schema";

export function getFuwariThemeStyle(siteConfig: SiteConfig): CSSProperties {
  return {
    "--fuwari-hue": String(siteConfig.theme.fuwari.primaryHue),
  } as CSSProperties;
}
