import z from "zod";

const clientEnvSchema = z.object({
  VITE_UMAMI_WEBSITE_ID: z.string().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  // 博客配置
  VITE_BLOG_TITLE: z.string().optional(),
  VITE_BLOG_NAME: z.string().optional(),
  VITE_BLOG_AUTHOR: z.string().optional(),
  VITE_BLOG_DESCRIPTION: z.string().optional(),
  VITE_BLOG_GITHUB: z.string().optional(),
  VITE_BLOG_EMAIL: z.string().optional(),
  // Fuwari 主题配置
  VITE_FUWARI_HOME_BG: z.string().optional(),
  VITE_FUWARI_AVATAR: z.string().optional(),
  // Cuckoo 主题配置
  VITE_CUCKOO_COVER_IMAGE: z.string().optional(),
  VITE_CUCKOO_AVATAR: z.string().optional(),
  VITE_CUCKOO_PRIMARY_COLOR: z.string().optional(),
  // Cuckoo 背景图片配置
  VITE_CUCKOO_BACKGROUND_ENABLED: z.string().optional(),
  VITE_CUCKOO_BACKGROUND_API: z.string().optional(),
  VITE_CUCKOO_BG_LIGHT_OPACITY: z.coerce.number().optional(),
  VITE_CUCKOO_BG_DARK_OPACITY: z.coerce.number().optional(),
  VITE_CUCKOO_BG_BACKDROP_BLUR: z.coerce.number().optional(),
  VITE_CUCKOO_BG_TRANSITION: z.coerce.number().optional(),
  // 背景图片配置
  VITE_DEFAULT_HOME_IMAGE: z.string().optional(),
  VITE_DEFAULT_GLOBAL_IMAGE: z.string().optional(),
  VITE_DEFAULT_LIGHT_OPACITY: z.coerce.number().optional(),
  VITE_DEFAULT_DARK_OPACITY: z.coerce.number().optional(),
  VITE_DEFAULT_BACKDROP_BLUR: z.coerce.number().optional(),
  VITE_DEFAULT_TRANSITION_DURATION: z.coerce.number().optional(),
});

export function clientEnv() {
  return clientEnvSchema.parse(import.meta.env);
}
