import { err, ok, type Result } from "@/lib/errors";
import { blogConfig } from "@/blog.config";

/** The square raster icon is at least this wide; the largest size made from it is 512. */
export const SITE_ICON_MIN_SIZE = 512;

export const SITE_ICON_ACCEPTED_TYPES = ["image/png", "image/jpeg"] as const;

/** Where the optional vector tab icon is stored. */
export const SITE_ICON_SVG_PATH = "favicon/favicon.svg";

/**
 * The PNGs one raster upload becomes: the size each is made at and the fixed
 * object-storage path it overwrites, so earlier addresses keep their files.
 */
export const SITE_ICON_SIZES = [
  { field: "favicon96", size: 96, path: "favicon/favicon-96x96.png" },
  { field: "appleTouchIcon", size: 180, path: "favicon/apple-touch-icon.png" },
  {
    field: "webApp192",
    size: 192,
    path: "favicon/web-app-manifest-192x192.png",
  },
  {
    field: "webApp512",
    size: 512,
    path: "favicon/web-app-manifest-512x512.png",
  },
] as const;

export type SiteIconField = (typeof SITE_ICON_SIZES)[number]["field"];
export type SiteIconSize = (typeof SITE_ICON_SIZES)[number];

/** What the Images binding's `info()` reports; an SVG has no pixel size. */
export type SiteIconInfo =
  | { format: "image/svg+xml" }
  | { format: string; width: number; height: number };

export type SiteIconRejection =
  | { reason: "SITE_ICON_UNSUPPORTED_TYPE" }
  | { reason: "SITE_ICON_NOT_SQUARE"; width: number; height: number }
  | { reason: "SITE_ICON_TOO_SMALL"; width: number; height: number };

/**
 * The sizes to make from an uploaded icon, or why it is refused: it must be a
 * PNG or a JPEG by its bytes, square, and at least {@link SITE_ICON_MIN_SIZE}
 * wide, so every size fits in it and none is enlarged.
 */
export function planSiteIcon(
  info: SiteIconInfo,
): Result<ReadonlyArray<SiteIconSize>, SiteIconRejection> {
  const format = info.format.toLowerCase();
  if (
    !("width" in info) ||
    !(SITE_ICON_ACCEPTED_TYPES as ReadonlyArray<string>).includes(format)
  ) {
    return err({ reason: "SITE_ICON_UNSUPPORTED_TYPE" });
  }
  const { width, height } = info;
  if (width !== height) {
    return err({ reason: "SITE_ICON_NOT_SQUARE", width, height });
  }
  if (width < SITE_ICON_MIN_SIZE) {
    return err({ reason: "SITE_ICON_TOO_SMALL", width, height });
  }
  return ok(SITE_ICON_SIZES);
}

type SavedIcons = { faviconSvg?: string; favicon96?: string } | undefined;

/**
 * Whether a saved icon address is an upload: the config often carries the
 * default files' paths, which count as nothing uploaded.
 */
export function isUploadedIcon(
  field: "faviconSvg" | "favicon96",
  value: string | undefined,
): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed) && trimmed !== blogConfig.icons[field];
}

/**
 * The vector tab icon the pages declare: the uploaded SVG, else the default
 * one only while the raster icon is the default too, else none. Browsers
 * prefer an SVG icon, so a default SVG beside an uploaded raster icon would
 * hide the upload.
 */
export function resolveFaviconSvg(icons: SavedIcons): string {
  const svg = icons?.faviconSvg;
  if (isUploadedIcon("faviconSvg", svg)) return svg;
  return isUploadedIcon("favicon96", icons?.favicon96)
    ? ""
    : blogConfig.icons.faviconSvg;
}
