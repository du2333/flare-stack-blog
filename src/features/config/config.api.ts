import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import * as ConfigService from "@/features/config/config.service";
import { adminMiddleware, dbMiddleware } from "@/lib/middlewares";
import { SystemConfigSchema } from "@/features/config/config.schema";

export const getSystemConfigFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => ConfigService.getSystemConfig(context));

export const updateSystemConfigFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(SystemConfigSchema)
  .handler(({ context, data }) =>
    ConfigService.updateSystemConfig(context, data),
  );

/**
 * 公开接口：获取 SEO 验证码（仅返回验证码字段，不暴露 API Key）
 */
export const getSeoVerificationFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const config = await ConfigService.getSystemConfig(context);
    return {
      googleVerification: config?.seo?.googleVerification || null,
      bingVerification: config?.seo?.bingVerification || null,
      baiduVerification: config?.seo?.baiduVerification || null,
    };
  });

/**
 * Admin: 批量提交 URL 到搜索引擎
 */
export const submitUrlsToSearchEnginesFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      urls: z.array(z.string().url()).min(1).max(500),
    }),
  )
  .handler(async ({ data, context }) => {
    return await ConfigService.submitUrlsToSearchEngines(context, data.urls);
  });

/**
 * Admin: 获取网站所有可索引 URL（自动生成 Sitemap URL 列表）
 */
export const getSiteUrlsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return await ConfigService.getSiteUrls(context);
  });
