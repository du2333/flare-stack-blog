import { z } from "zod";
import { DEFAULT_THEME_ID, THEME_IDS } from "@/features/theme/theme-ids";
import type { Messages } from "@/lib/i18n";
import {
  canonicalizeNavHref,
  isNavHref,
  NAV_LINK_LABEL_MAX,
  NAV_LINKS_MAX,
} from "./utils/nav-links";
import { SOCIAL_PLATFORM_KEYS } from "./utils/social-platforms";

const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORM_KEYS),
  url: z.string(),
  icon: z.string().optional(),
  label: z.string().optional(),
});

export const PRIMARY_HUE_MIN = 0;
export const PRIMARY_HUE_MAX = 360;
export const BANNER_FOCUS_MIN = 0;
export const BANNER_FOCUS_MAX = 100;
export const TAGLINE_MAX = 80;

/** The Theme ids live with the Theme registry; Site Config only checks them. */
export {
  DEFAULT_THEME_ID,
  isThemeId,
  THEME_IDS,
  type ThemeId,
} from "@/features/theme/theme-ids";

/** What the navigation shows as the site's mark. */
export const BRAND_MARKS = ["default", "siteIcon", "avatar", "none"] as const;
export type BrandMark = (typeof BRAND_MARKS)[number];

function createSiteTextSchema(max: number) {
  return z.string().trim().max(max);
}

const NavLinkSchema = z.object({
  label: createSiteTextSchema(NAV_LINK_LABEL_MAX).pipe(z.string().min(1)),
  href: z.string().trim().refine(isNavHref, {
    message: "Please enter a root-relative path or http(s) URL",
  }),
});

function createNavLinksFormSchema(messages: Messages) {
  return z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    )
    .max(NAV_LINKS_MAX)
    .transform((links) =>
      links.map((link) => ({
        label: link.label.trim(),
        href: canonicalizeNavHref(link.href),
      })),
    )
    .superRefine((links, ctx) => {
      links.forEach((link, index) => {
        if (!link.label && !link.href) return;
        if (!link.label) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_nav_label_required(),
            path: [index, "label"],
          });
        } else if (link.label.length > NAV_LINK_LABEL_MAX) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_too_long({
              max: NAV_LINK_LABEL_MAX,
            }),
            path: [index, "label"],
          });
        }
        if (!link.href) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_nav_href_required(),
            path: [index, "href"],
          });
        } else if (!isNavHref(link.href)) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_invalid_nav_href(),
            path: [index, "href"],
          });
        }
      });
    });
}

function createSiteTextFormSchema(max: number, messages: Messages) {
  return z
    .string()
    .trim()
    .max(max, messages.settings_site_validation_too_long({ max }));
}

function createAssetRefSchema() {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetRefFormSchema(messages: Messages) {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_ref(),
  });
}

function isExternalImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createBackgroundImageRefSchema() {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message: "Please enter a root-relative path or http(s) URL",
      },
    );
}

function createBackgroundImageRefFormSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message:
          messages.settings_site_validation_invalid_background_image_ref(),
      },
    );
}

function createAssetPathSchema() {
  return z.string().refine((value) => value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetPathFormSchema(messages: Messages) {
  return z.string().refine((value) => value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_path(),
  });
}

function createOptionalAssetPathSchema() {
  return z.union([createAssetPathSchema(), z.literal("")]);
}

function createOptionalAssetPathFormSchema(messages: Messages) {
  return z.union([createAssetPathFormSchema(messages), z.literal("")]);
}

function createHueSchema() {
  return z
    .number()
    .int()
    .min(PRIMARY_HUE_MIN)
    .max(PRIMARY_HUE_MAX, {
      message: `Value must be between ${PRIMARY_HUE_MIN} and ${PRIMARY_HUE_MAX}`,
    });
}

function createHueFormSchema(messages: Messages) {
  return z.number().int().min(PRIMARY_HUE_MIN).max(PRIMARY_HUE_MAX, {
    message: messages.settings_site_validation_hue_range(),
  });
}

const focusCoordinate = z
  .number()
  .int()
  .min(BANNER_FOCUS_MIN)
  .max(BANNER_FOCUS_MAX);

export const BannerImageSchema = createBackgroundImageRefSchema().describe(
  "Banner image: a root-relative path, an http(s) URL, or an empty string for none. Every Theme shows it.",
);
export const BannerFocusSchema = z
  .object({ x: focusCoordinate, y: focusCoordinate })
  .describe(
    "Point of the banner image kept in view when a Theme crops it, in percent from the left (x) and the top (y). 50/50 is the centre.",
  );
export const AvatarSchema = createAssetRefSchema().describe(
  "Author avatar: a root-relative path, or an empty string for none.",
);
export const PrimaryHueSchema = createHueSchema().describe(
  "Primary colour hue in degrees (0–360). Public pages, the Admin workbench and emails derive their accent colours from it.",
);
export const BrandMarkSchema = z
  .enum(BRAND_MARKS)
  .describe(
    "What the navigation shows as the site's mark: default (the built-in icon), siteIcon (the uploaded site icon), avatar, or none.",
  );
export const TaglineSchema = createSiteTextSchema(TAGLINE_MAX).describe(
  "Short line a Theme may show on the home page banner. Empty for none.",
);
export const ThemeIdSchema = z
  .enum(THEME_IDS)
  .describe(
    `Theme the public pages use: ${THEME_IDS.join(", ")}. A saved id that this version does not offer is read as ${DEFAULT_THEME_ID}.`,
  );
/** One option value. Flat, so the settings form can type the options. */
export const ThemeOptionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
/** Options of one Theme; each Theme defines its own keys. */
const ThemeOptionsSchema = z.record(z.string(), ThemeOptionValueSchema);
export const ThemeOptionsByIdSchema = z
  .record(z.string(), ThemeOptionsSchema)
  .describe(
    "Options of each Theme, keyed by Theme id; each Theme defines its own keys. Options of a Theme that is not selected are kept.",
  );

/**
 * Where the banner image, avatar and hue lived before they were shared by all
 * Themes. Written as a copy of the shared fields for one release, so an older
 * build reading the same row still shows them; read only when a shared field
 * is missing.
 */
function createLegacyFuwariSchema() {
  return z
    .object({
      homeBg: createBackgroundImageRefSchema().optional(),
      avatar: createAssetRefSchema().optional(),
      primaryHue: createHueSchema().optional(),
    })
    .describe(
      "Deprecated copy of bannerImage, avatar and primaryHue for older versions. It is rewritten on every save and only read when the shared field is omitted.",
    );
}

export const FullSiteConfigSchema = z.object({
  title: createSiteTextSchema(120),
  author: createSiteTextSchema(80),
  description: createSiteTextSchema(300),
  social: z.array(SocialLinkSchema),
  navLinks: z.array(NavLinkSchema).max(NAV_LINKS_MAX),
  icons: z.object({
    faviconSvg: createAssetPathSchema(),
    faviconIco: createAssetPathSchema(),
    favicon96: createAssetPathSchema(),
    appleTouchIcon: createAssetPathSchema(),
    webApp192: createAssetPathSchema(),
    webApp512: createAssetPathSchema(),
  }),
  bannerImage: BannerImageSchema,
  bannerFocus: BannerFocusSchema,
  avatar: AvatarSchema,
  primaryHue: PrimaryHueSchema,
  brandMark: BrandMarkSchema,
  tagline: TaglineSchema,
  theme: z.object({
    id: ThemeIdSchema,
    options: ThemeOptionsByIdSchema,
    fuwari: createLegacyFuwariSchema().optional(),
  }),
});

export function createSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    title: createSiteTextFormSchema(120, messages).optional(),
    author: createSiteTextFormSchema(80, messages).optional(),
    description: createSiteTextFormSchema(300, messages).optional(),
    social: z.array(SocialLinkSchema).optional(),
    navLinks: createNavLinksFormSchema(messages).optional(),
    icons: z
      .object({
        faviconSvg: createOptionalAssetPathFormSchema(messages).optional(),
        faviconIco: createOptionalAssetPathFormSchema(messages).optional(),
        favicon96: createOptionalAssetPathFormSchema(messages).optional(),
        appleTouchIcon: createOptionalAssetPathFormSchema(messages).optional(),
        webApp192: createOptionalAssetPathFormSchema(messages).optional(),
        webApp512: createOptionalAssetPathFormSchema(messages).optional(),
      })
      .optional(),
    bannerImage: createBackgroundImageRefFormSchema(messages).optional(),
    bannerFocus: BannerFocusSchema.optional(),
    avatar: createAssetRefFormSchema(messages).optional(),
    primaryHue: createHueFormSchema(messages).optional(),
    brandMark: BrandMarkSchema.optional(),
    tagline: createSiteTextFormSchema(TAGLINE_MAX, messages).optional(),
    // The form edits the shared fields, so the legacy copy is not submitted.
    theme: z
      .object({
        id: ThemeIdSchema.optional(),
        options: ThemeOptionsByIdSchema.optional(),
      })
      .optional(),
  });
}

export const SiteConfigInputSchema = z.object({
  title: createSiteTextSchema(120).optional(),
  author: createSiteTextSchema(80).optional(),
  description: createSiteTextSchema(300).optional(),
  social: z.array(SocialLinkSchema).optional(),
  navLinks: z.array(NavLinkSchema).max(NAV_LINKS_MAX).optional(),
  icons: z
    .object({
      faviconSvg: createOptionalAssetPathSchema().optional(),
      faviconIco: createOptionalAssetPathSchema().optional(),
      favicon96: createOptionalAssetPathSchema().optional(),
      appleTouchIcon: createOptionalAssetPathSchema().optional(),
      webApp192: createOptionalAssetPathSchema().optional(),
      webApp512: createOptionalAssetPathSchema().optional(),
    })
    .optional(),
  bannerImage: BannerImageSchema.optional(),
  bannerFocus: BannerFocusSchema.optional(),
  avatar: AvatarSchema.optional(),
  primaryHue: PrimaryHueSchema.optional(),
  brandMark: BrandMarkSchema.optional(),
  tagline: TaglineSchema.optional(),
  theme: z
    .object({
      id: ThemeIdSchema.optional(),
      options: ThemeOptionsByIdSchema.optional(),
      fuwari: createLegacyFuwariSchema().optional(),
    })
    .optional(),
});

export type SiteConfig = z.infer<typeof FullSiteConfigSchema>;
export type SiteConfigInput = z.infer<typeof SiteConfigInputSchema>;
