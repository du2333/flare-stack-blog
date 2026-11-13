import type { CSSProperties } from "react";
import type { SiteConfig } from "@/features/config/site-config.schema";

/**
 * The style of `<html>`, where the primary hue enters the page. `primaryHue`
 * stands in for Site Config's while a Theme preview moves it in place.
 */
export function getFuwariThemeStyle(
  siteConfig?: SiteConfig | null,
  primaryHue?: number,
): CSSProperties {
  // The root error boundary must still render when loading Site Config fails.
  // Without a config, use the default hue in styles.css.
  if (!siteConfig) return {};
  return {
    "--fuwari-hue": String(primaryHue ?? siteConfig.primaryHue),
  } as CSSProperties;
}
