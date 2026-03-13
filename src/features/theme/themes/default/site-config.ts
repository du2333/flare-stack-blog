import { z } from "zod";

export const defaultThemeBackgroundSchema = z.object({
  homeImage: z.string(),
  globalImage: z.string(),
  light: z.object({
    opacity: z.number(),
  }),
  dark: z.object({
    opacity: z.number(),
  }),
  backdropBlur: z.number(),
  transitionDuration: z.number(),
});

export const defaultThemeBackgroundInputSchema = z.object({
  homeImage: z.string().optional(),
  globalImage: z.string().optional(),
  light: z
    .object({
      opacity: z.number().optional(),
    })
    .optional(),
  dark: z
    .object({
      opacity: z.number().optional(),
    })
    .optional(),
  backdropBlur: z.number().optional(),
  transitionDuration: z.number().optional(),
});

export const defaultThemeSiteConfigSchema = z.object({
  navBarName: z.string(),
  background: defaultThemeBackgroundSchema.optional(),
});

export const defaultThemeSiteConfigInputSchema = z.object({
  navBarName: z.string().optional(),
  background: defaultThemeBackgroundInputSchema.optional(),
});

export type DefaultThemeSiteConfig = z.infer<
  typeof defaultThemeSiteConfigSchema
>;
export type DefaultThemeBackground = z.infer<
  typeof defaultThemeBackgroundSchema
>;
export type DefaultThemeSiteConfigInput = z.infer<
  typeof defaultThemeSiteConfigInputSchema
>;
