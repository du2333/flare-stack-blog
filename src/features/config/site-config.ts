import { z } from "zod";
import {
  defaultThemeSiteConfigInputSchema,
  defaultThemeSiteConfigSchema,
} from "@/features/theme/themes/default/site-config";
import {
  fuwariThemeSiteConfigInputSchema,
  fuwariThemeSiteConfigSchema,
} from "@/features/theme/themes/fuwari/site-config";

export const FullSiteConfigSchema = z.object({
  title: z.string(),
  author: z.string(),
  description: z.string(),
  social: z.object({
    github: z.string(),
    email: z.union([z.email(), z.literal("")]),
  }),
  theme: z.object({
    default: defaultThemeSiteConfigSchema,
    fuwari: fuwariThemeSiteConfigSchema,
  }),
});

export const SiteConfigInputSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  social: z
    .object({
      github: z.string().optional(),
      email: z.union([z.email(), z.literal("")]).optional(),
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

export type SiteConfig = z.infer<typeof FullSiteConfigSchema>;
export type SiteConfigInput = z.infer<typeof SiteConfigInputSchema>;
