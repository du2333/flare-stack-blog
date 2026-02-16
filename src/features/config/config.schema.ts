import { z } from "zod";

export const BackgroundConfigSchema = z.object({
  imageUrl: z.string().optional(),
  homeImageUrl: z.string().optional(),
  opacity: z.number().min(0).max(100).optional(),
  darkOpacity: z.number().min(0).max(100).optional(),
  blur: z.number().min(0).max(20).optional(),
  overlayOpacity: z.number().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

export type BackgroundConfig = z.infer<typeof BackgroundConfigSchema>;

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  imageUrl: "",
  homeImageUrl: "",
  opacity: 20,
  darkOpacity: 10,
  blur: 1,
  overlayOpacity: 80,
  enabled: false,
};

export const SystemConfigSchema = z.object({
  email: z
    .object({
      apiKey: z.string().optional(),
      senderName: z.string().optional(),
      senderAddress: z.union([z.email(), z.literal("")]).optional(),
    })
    .optional(),
  background: BackgroundConfigSchema.optional(),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const DEFAULT_CONFIG: SystemConfig = {
  email: {
    apiKey: "",
    senderName: "",
    senderAddress: "",
  },
  background: DEFAULT_BACKGROUND_CONFIG,
};

export const CONFIG_CACHE_KEYS = {
  system: ["system"] as const,
  isEmailConfigured: ["isEmailConfigured"] as const,
} as const;
