import { z } from "zod";

export const SystemConfigSchema = z.object({
  email: z
    .object({
      apiKey: z.string().optional(),
      senderName: z.string().optional(),
      senderAddress: z.union([z.email(), z.literal("")]).optional(),
    })
    .optional(),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const DEFAULT_CONFIG: SystemConfig = {
  email: {
    apiKey: "",
    senderName: "",
    senderAddress: "",
  },
};

export const CONFIG_CACHE_KEYS = {
  system: ["system"] as const,
} as const;
