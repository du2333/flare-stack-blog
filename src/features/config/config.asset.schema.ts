import type { ThemeName } from "@/features/theme/registry";
import { themeNames } from "@/features/theme/registry";
import type { Messages } from "@/lib/i18n";

export const SITE_ASSET_MAX_FILE_SIZE = 8 * 1024 * 1024; // 2MB

export const SITE_ASSET_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

type ThemePrefix = `themes/${ThemeName}/`;
const themePrefixes = themeNames.map(
  (name) => `themes/${name}/` satisfies ThemePrefix,
);
const ALLOWED_ASSET_PREFIXES = ["favicon/", ...themePrefixes] as const;

function isAllowedAssetPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").replace(/\\/g, "/");
  return ALLOWED_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function parseSiteAssetUploadInput(
  formData: FormData,
  messages: Messages,
): { file: File; assetPath: string } {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error(messages.settings_asset_validation_file_required());
  }

  const assetPath = formData.get("assetPath");
  if (typeof assetPath !== "string" || !assetPath.trim()) {
    throw new Error(messages.settings_asset_validation_path_required());
  }

  const trimmedPath = assetPath.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!isAllowedAssetPath(trimmedPath)) {
    throw new Error(messages.settings_asset_validation_path_invalid());
  }

  if (file.size > SITE_ASSET_MAX_FILE_SIZE) {
    throw new Error(messages.settings_asset_validation_file_too_large());
  }

  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowedMimes = new Set<string>(SITE_ASSET_ACCEPTED_TYPES);
  const allowedExts = new Set([
    "jpeg",
    "jpg",
    "png",
    "webp",
    "gif",
    "svg",
    "ico",
  ]);

  if (!allowedMimes.has(mime) && !allowedExts.has(ext ?? "")) {
    throw new Error(messages.settings_asset_validation_file_invalid_type());
  }

  return { file, assetPath: trimmedPath };
}
