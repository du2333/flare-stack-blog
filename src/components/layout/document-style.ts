import type { CSSProperties } from "react";
import type { SiteConfig } from "@/features/config/site-config.schema";

export function getFuwariThemeStyle(
  siteConfig?: SiteConfig | null,
): CSSProperties {
  // The root error boundary must still render when loading Site Config fails.
  // Without a config, use the default hue in styles.css.
  if (!siteConfig) return {};
  return {
    "--fuwari-hue": String(siteConfig.primaryHue),
  } as CSSProperties;
}
