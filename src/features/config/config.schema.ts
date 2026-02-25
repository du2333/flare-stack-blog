import { z } from "zod";

export const SystemConfigSchema = z.object({
  email: z
    .object({
      apiKey: z.string().optional(),
      senderName: z.string().optional(),
      senderAddress: z.union([z.email(), z.literal("")]).optional(),
    })
    .optional(),
  seo: z
    .object({
      /** Google Search Console 验证码（meta tag content 值） */
      googleVerification: z.string().optional(),
      /** Bing Webmaster Tools 验证码 */
      bingVerification: z.string().optional(),
      /** 百度站长平台验证码 */
      baiduVerification: z.string().optional(),
      /** Bing Webmaster API Key（用于 URL 提交） */
      bingApiKey: z.string().optional(),
      /** 百度站长 Token（用于 URL 推送） */
      baiduPushToken: z.string().optional(),
      /** Google Indexing API JSON Key（base64 编码的 Service Account Key） */
      googleIndexingKey: z.string().optional(),
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
  seo: {
    googleVerification: "",
    bingVerification: "",
    baiduVerification: "",
    bingApiKey: "",
    baiduPushToken: "",
    googleIndexingKey: "",
  },
};

export const CONFIG_CACHE_KEYS = {
  system: ["system"] as const,
  isEmailConfigured: ["isEmailConfigured"] as const,
} as const;
