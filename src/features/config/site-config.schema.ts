import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { SOCIAL_PLATFORM_KEYS } from "./utils/social-platforms";

export const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORM_KEYS),
  url: z.string(),
  icon: z.string().optional(),
  label: z.string().optional(),
});

export const DEFAULT_THEME_OPACITY_MIN = 0;
export const DEFAULT_THEME_OPACITY_MAX = 0.4;
export const DEFAULT_THEME_BLUR_MIN = 0;
export const DEFAULT_THEME_BLUR_MAX = 32;
export const DEFAULT_THEME_TRANSITION_MIN = 0;
export const DEFAULT_THEME_TRANSITION_MAX = 1500;
export const FUWARI_THEME_HUE_MIN = 0;
export const FUWARI_THEME_HUE_MAX = 360;

function createSiteTextSchema(max: number) {
  return z.string().trim().max(max);
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

function createOpacitySchema() {
  return z
    .number()
    .min(DEFAULT_THEME_OPACITY_MIN)
    .max(DEFAULT_THEME_OPACITY_MAX, {
      message: `Value must be between ${DEFAULT_THEME_OPACITY_MIN} and ${DEFAULT_THEME_OPACITY_MAX}`,
    });
}

function createOpacityFormSchema(messages: Messages) {
  return z
    .number()
    .min(DEFAULT_THEME_OPACITY_MIN)
    .max(DEFAULT_THEME_OPACITY_MAX, {
      message: messages.settings_site_validation_opacity_range(),
    });
}

function createBlurSchema() {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_BLUR_MIN)
    .max(DEFAULT_THEME_BLUR_MAX, {
      message: `Value must be between ${DEFAULT_THEME_BLUR_MIN} and ${DEFAULT_THEME_BLUR_MAX}`,
    });
}

function createBlurFormSchema(messages: Messages) {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_BLUR_MIN)
    .max(DEFAULT_THEME_BLUR_MAX, {
      message: messages.settings_site_validation_blur_range(),
    });
}

function createTransitionDurationSchema() {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_TRANSITION_MIN)
    .max(DEFAULT_THEME_TRANSITION_MAX, {
      message: `Value must be between ${DEFAULT_THEME_TRANSITION_MIN} and ${DEFAULT_THEME_TRANSITION_MAX}`,
    });
}

function createTransitionDurationFormSchema(messages: Messages) {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_TRANSITION_MIN)
    .max(DEFAULT_THEME_TRANSITION_MAX, {
      message: messages.settings_site_validation_transition_range(),
    });
}

function createHueSchema() {
  return z
    .number()
    .int()
    .min(FUWARI_THEME_HUE_MIN)
    .max(FUWARI_THEME_HUE_MAX, {
      message: `Value must be between ${FUWARI_THEME_HUE_MIN} and ${FUWARI_THEME_HUE_MAX}`,
    });
}

function createHueFormSchema(messages: Messages) {
  return z.number().int().min(FUWARI_THEME_HUE_MIN).max(FUWARI_THEME_HUE_MAX, {
    message: messages.settings_site_validation_hue_range(),
  });
}

function createDefaultThemeBackgroundSchema() {
  return z.object({
    homeImage: createBackgroundImageRefSchema(),
    globalImage: createBackgroundImageRefSchema(),
    light: z.object({
      opacity: createOpacitySchema(),
    }),
    dark: z.object({
      opacity: createOpacitySchema(),
    }),
    backdropBlur: createBlurSchema(),
    transitionDuration: createTransitionDurationSchema(),
  });
}

function createDefaultThemeBackgroundInputSchema() {
  return z.object({
    homeImage: createBackgroundImageRefSchema().optional(),
    globalImage: createBackgroundImageRefSchema().optional(),
    light: z
      .object({
        opacity: createOpacitySchema().optional(),
      })
      .optional(),
    dark: z
      .object({
        opacity: createOpacitySchema().optional(),
      })
      .optional(),
    backdropBlur: createBlurSchema().optional(),
    transitionDuration: createTransitionDurationSchema().optional(),
  });
}

function createDefaultThemeBackgroundInputFormSchema(messages: Messages) {
  return z.object({
    homeImage: createBackgroundImageRefFormSchema(messages).optional(),
    globalImage: createBackgroundImageRefFormSchema(messages).optional(),
    light: z
      .object({
        opacity: createOpacityFormSchema(messages).optional(),
      })
      .optional(),
    dark: z
      .object({
        opacity: createOpacityFormSchema(messages).optional(),
      })
      .optional(),
    backdropBlur: createBlurFormSchema(messages).optional(),
    transitionDuration: createTransitionDurationFormSchema(messages).optional(),
  });
}

function createDefaultThemeSiteConfigSchema() {
  return z.object({
    navBarName: createSiteTextSchema(60),
    background: createDefaultThemeBackgroundSchema().optional(),
  });
}

function createDefaultThemeSiteConfigInputSchema() {
  return z.object({
    navBarName: createSiteTextSchema(60).optional(),
    background: createDefaultThemeBackgroundInputSchema().optional(),
  });
}

function createDefaultThemeSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    navBarName: createSiteTextFormSchema(60, messages).optional(),
    background:
      createDefaultThemeBackgroundInputFormSchema(messages).optional(),
  });
}

function createFuwariThemeSiteConfigSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema(),
    avatar: createAssetRefSchema(),
    primaryHue: createHueSchema(),
  });
}

function createFuwariThemeSiteConfigInputSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema().optional(),
    avatar: createAssetRefSchema().optional(),
    primaryHue: createHueSchema().optional(),
  });
}

function createFuwariThemeSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    homeBg: createBackgroundImageRefFormSchema(messages).optional(),
    avatar: createAssetRefFormSchema(messages).optional(),
    primaryHue: createHueFormSchema(messages).optional(),
  });
}

export const defaultThemeBackgroundSchema =
  createDefaultThemeBackgroundSchema();
export const defaultThemeBackgroundInputSchema =
  createDefaultThemeBackgroundInputSchema();
export const defaultThemeSiteConfigSchema =
  createDefaultThemeSiteConfigSchema();
export const defaultThemeSiteConfigInputSchema =
  createDefaultThemeSiteConfigInputSchema();
export const fuwariThemeSiteConfigSchema = createFuwariThemeSiteConfigSchema();
export const fuwariThemeSiteConfigInputSchema =
  createFuwariThemeSiteConfigInputSchema();

export const FullSiteConfigSchema = z.object({
  title: createSiteTextSchema(120),
  author: createSiteTextSchema(80),
  description: createSiteTextSchema(300),
  social: z.array(SocialLinkSchema),
  icons: z.object({
    faviconSvg: createAssetPathSchema(),
    faviconIco: createAssetPathSchema(),
    favicon96: createAssetPathSchema(),
    appleTouchIcon: createAssetPathSchema(),
    webApp192: createAssetPathSchema(),
    webApp512: createAssetPathSchema(),
  }),
  theme: z.object({
    default: defaultThemeSiteConfigSchema,
    fuwari: fuwariThemeSiteConfigSchema,
  }),
});

export function createSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    title: createSiteTextFormSchema(120, messages).optional(),
    author: createSiteTextFormSchema(80, messages).optional(),
    description: createSiteTextFormSchema(300, messages).optional(),
    social: z.array(SocialLinkSchema).optional(),
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
    theme: z
      .object({
        default:
          createDefaultThemeSiteConfigInputFormSchema(messages).optional(),
        fuwari: createFuwariThemeSiteConfigInputFormSchema(messages).optional(),
      })
      .optional(),
  });
}

export const SiteConfigInputSchema = z.object({
  title: createSiteTextSchema(120).optional(),
  author: createSiteTextSchema(80).optional(),
  description: createSiteTextSchema(300).optional(),
  social: z.array(SocialLinkSchema).optional(),
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
  theme: z
    .object({
      default: defaultThemeSiteConfigInputSchema.optional(),
      fuwari: fuwariThemeSiteConfigInputSchema.optional(),
    })
    .optional(),
});

export const SiteConfigSchema = SiteConfigInputSchema;

export type DefaultThemeSiteConfig = z.infer<
  typeof defaultThemeSiteConfigSchema
>;
export type DefaultThemeBackground = z.infer<
  typeof defaultThemeBackgroundSchema
>;
export type DefaultThemeSiteConfigInput = z.infer<
  typeof defaultThemeSiteConfigInputSchema
>;
export type FuwariThemeSiteConfig = z.infer<typeof fuwariThemeSiteConfigSchema>;
export type FuwariThemeSiteConfigInput = z.infer<
  typeof fuwariThemeSiteConfigInputSchema
>;
export type SiteConfig = z.infer<typeof FullSiteConfigSchema>;
export type SiteConfigInput = z.infer<typeof SiteConfigInputSchema>;
