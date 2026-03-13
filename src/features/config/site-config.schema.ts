import { z } from "zod";
import type { Messages } from "@/lib/i18n";

function isAbsoluteUrl(value: string) {
  return URL.canParse(value);
}

function isSiteAssetRef(value: string) {
  return value === "" || value.startsWith("/") || isAbsoluteUrl(value);
}

function createSiteTextSchema(max: number, messages?: Messages) {
  return z
    .string()
    .trim()
    .max(max, messages?.friend_link_validation_too_long({ max }));
}

function createUrlSchema(messages?: Messages) {
  return z.union([
    z.string().url(messages?.friend_link_validation_invalid_url()),
    z.literal(""),
  ]);
}

function createEmailSchema(messages?: Messages) {
  return z.union([
    z.string().email(messages?.friend_link_validation_invalid_email()),
    z.literal(""),
  ]);
}

function createAssetRefSchema(messages?: Messages) {
  return z.string().refine(isSiteAssetRef, {
    message:
      messages?.settings_site_validation_invalid_asset_ref() ??
      "Please enter an absolute URL or a root-relative path",
  });
}

function createOpacitySchema(messages?: Messages) {
  return z
    .number()
    .min(0)
    .max(1, {
      message:
        messages?.settings_site_validation_opacity_range() ??
        "Value must be between 0 and 1",
    });
}

function createBlurSchema(messages?: Messages) {
  return z
    .number()
    .int()
    .min(0)
    .max(64, {
      message:
        messages?.settings_site_validation_blur_range() ??
        "Value must be between 0 and 64",
    });
}

function createTransitionDurationSchema(messages?: Messages) {
  return z
    .number()
    .int()
    .min(0)
    .max(3000, {
      message:
        messages?.settings_site_validation_transition_range() ??
        "Value must be between 0 and 3000",
    });
}

function createDefaultThemeBackgroundSchema(messages?: Messages) {
  return z.object({
    homeImage: createAssetRefSchema(messages),
    globalImage: createAssetRefSchema(messages),
    light: z.object({
      opacity: createOpacitySchema(messages),
    }),
    dark: z.object({
      opacity: createOpacitySchema(messages),
    }),
    backdropBlur: createBlurSchema(messages),
    transitionDuration: createTransitionDurationSchema(messages),
  });
}

function createDefaultThemeBackgroundInputSchema(messages?: Messages) {
  return z.object({
    homeImage: createAssetRefSchema(messages).optional(),
    globalImage: createAssetRefSchema(messages).optional(),
    light: z
      .object({
        opacity: createOpacitySchema(messages).optional(),
      })
      .optional(),
    dark: z
      .object({
        opacity: createOpacitySchema(messages).optional(),
      })
      .optional(),
    backdropBlur: createBlurSchema(messages).optional(),
    transitionDuration: createTransitionDurationSchema(messages).optional(),
  });
}

function createDefaultThemeSiteConfigSchema(messages?: Messages) {
  return z.object({
    navBarName: createSiteTextSchema(60, messages),
    background: createDefaultThemeBackgroundSchema(messages).optional(),
  });
}

function createDefaultThemeSiteConfigInputSchema(messages?: Messages) {
  return z.object({
    navBarName: createSiteTextSchema(60, messages).optional(),
    background: createDefaultThemeBackgroundInputSchema(messages).optional(),
  });
}

function createFuwariThemeSiteConfigSchema(messages?: Messages) {
  return z.object({
    homeBg: createAssetRefSchema(messages),
    avatar: createAssetRefSchema(messages),
  });
}

function createFuwariThemeSiteConfigInputSchema(messages?: Messages) {
  return z.object({
    homeBg: createAssetRefSchema(messages).optional(),
    avatar: createAssetRefSchema(messages).optional(),
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
  social: z.object({
    github: createUrlSchema(),
    email: createEmailSchema(),
  }),
  theme: z.object({
    default: defaultThemeSiteConfigSchema,
    fuwari: fuwariThemeSiteConfigSchema,
  }),
});

export function createSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    title: createSiteTextSchema(120, messages).optional(),
    author: createSiteTextSchema(80, messages).optional(),
    description: createSiteTextSchema(300, messages).optional(),
    social: z
      .object({
        github: createUrlSchema(messages).optional(),
        email: createEmailSchema(messages).optional(),
      })
      .optional(),
    theme: z
      .object({
        default: createDefaultThemeSiteConfigInputSchema(messages).optional(),
        fuwari: createFuwariThemeSiteConfigInputSchema(messages).optional(),
      })
      .optional(),
  });
}

export const SiteConfigInputSchema = z.object({
  title: createSiteTextSchema(120).optional(),
  author: createSiteTextSchema(80).optional(),
  description: createSiteTextSchema(300).optional(),
  social: z
    .object({
      github: createUrlSchema().optional(),
      email: createEmailSchema().optional(),
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
