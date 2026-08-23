import type { SiteConfig } from "@/features/config/site-config.schema";

export function getHomeBackgroundPreloadImages(
  siteConfig: SiteConfig,
): Array<string> {
  return siteConfig.theme.fuwari.homeBg ? [siteConfig.theme.fuwari.homeBg] : [];
}
