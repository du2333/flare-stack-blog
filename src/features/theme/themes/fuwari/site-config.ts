import { z } from "zod";

export const fuwariThemeSiteConfigSchema = z.object({
  homeBg: z.string(),
  avatar: z.string(),
});

export const fuwariThemeSiteConfigInputSchema = z.object({
  homeBg: z.string().optional(),
  avatar: z.string().optional(),
});

export type FuwariThemeSiteConfig = z.infer<typeof fuwariThemeSiteConfigSchema>;
export type FuwariThemeSiteConfigInput = z.infer<
  typeof fuwariThemeSiteConfigInputSchema
>;
