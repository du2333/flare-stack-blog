import type { BrandMark } from "@/features/config/site-config.schema";

/**
 * The image a brand mark choice shows, or null where there is none to show
 * (the built-in icon, no mark, or an image that is not set), so the caller
 * falls back to the built-in icon. The site icon is the SVG one, or the 96px
 * one when there is no SVG.
 */
export function resolveBrandMarkImage(
  brandMark: BrandMark,
  site: {
    avatar: string;
    icons: { faviconSvg: string; favicon96: string };
  },
): { kind: "siteIcon" | "avatar"; src: string } | null {
  if (brandMark === "siteIcon") {
    const src = site.icons.faviconSvg.trim() || site.icons.favicon96.trim();
    return src ? { kind: "siteIcon", src } : null;
  }
  if (brandMark === "avatar") {
    const src = site.avatar.trim();
    return src ? { kind: "avatar", src } : null;
  }
  return null;
}
