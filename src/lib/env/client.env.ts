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
  // 背景配置
  VITE_BLOG_BACKGROUND_IMAGE_URL: z.string().optional(),
  VITE_BLOG_BACKGROUND_HOME_IMAGE_URL: z.string().optional(),
  VITE_BLOG_BACKGROUND_OPACITY: z.coerce.number().optional(),
  VITE_BLOG_BACKGROUND_DARK_OPACITY: z.coerce.number().optional(),
  VITE_BLOG_BACKGROUND_BLUR: z.coerce.number().optional(),
  VITE_BLOG_BACKGROUND_OVERLAY_OPACITY: z.coerce.number().optional(),
  VITE_BLOG_BACKGROUND_TRANSITION_DURATION: z.coerce.number().optional(),
});

export function clientEnv() {
  return clientEnvSchema.parse(import.meta.env);
}
