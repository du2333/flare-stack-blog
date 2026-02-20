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
});

export function clientEnv() {
  return clientEnvSchema.parse(import.meta.env);
}
