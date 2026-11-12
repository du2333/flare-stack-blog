import type { z } from "zod";
import {
  AvatarSchema,
  BannerFocusSchema,
  BannerImageSchema,
  BrandMarkSchema,
  PrimaryHueSchema,
  TaglineSchema,
  type SiteConfig,
} from "@/features/config/site-config.schema";

/**
 * The Site Config fields about presentation rather than identity, which a
 * Theme preview may carry unsaved. Image fields name assets already uploaded
 * (a key or a URL), never their data, so the address stays short.
 */
const DRAFT_FIELD_SCHEMAS = {
  bannerImage: BannerImageSchema,
  bannerFocus: BannerFocusSchema,
  avatar: AvatarSchema,
  primaryHue: PrimaryHueSchema,
  brandMark: BrandMarkSchema,
  tagline: TaglineSchema,
} satisfies Record<string, z.ZodType>;

export type SiteConfigDraftField = keyof typeof DRAFT_FIELD_SCHEMAS;
export type SiteConfigDraft = Partial<Pick<SiteConfig, SiteConfigDraftField>>;

function parseObject(value: unknown): Record<string, unknown> {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * The draft a preview address carries, as JSON or as the object the router
 * parsed it into. Each field is checked with its own Site Config schema; one
 * that is missing, unknown or invalid is left out, so the saved value shows.
 */
export function readSiteConfigDraft(value: unknown): SiteConfigDraft {
  const raw = parseObject(value);
  const draft: Record<string, unknown> = {};
  for (const [field, schema] of Object.entries(DRAFT_FIELD_SCHEMAS)) {
    if (raw[field] === undefined) continue;
    const result = schema.safeParse(raw[field]);
    if (result.success) draft[field] = result.data;
  }
  return draft as SiteConfigDraft;
}
