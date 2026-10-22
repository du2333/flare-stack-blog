import { notFound } from "@tanstack/react-router";
import type { SiteConfig } from "@/features/config/site-config.schema";

/**
 * 板块功能开关的消费层。
 *
 * 约定（对应 PLAN-v2 §6.2 / R2 条件 C2）：
 *   - 配置在 `blog.config.ts` 的 `features` 字段
 *   - **构建期读取**，切换后需重新部署（不是运行时 kill switch）
 *   - `false` 时：导航不显示该项 + 路由返回 404
 *
 * 注意：这是「构建期开关」，不能替代灰度发布或紧急回退。
 * 紧急停用某个板块 = 改配置 + 重新部署（约 2 分钟）。
 */

export type FeatureKey = "moments" | "library" | "about";

export const ALL_FEATURE_KEYS: ReadonlyArray<FeatureKey> = [
  "moments",
  "library",
  "about",
] as const;

/** 读取某板块是否启用；缺省视为关闭（fail-closed） */
export function isFeatureEnabled(
  siteConfig: Pick<SiteConfig, "features"> | undefined | null,
  key: FeatureKey,
): boolean {
  return siteConfig?.features?.[key] === true;
}

/** 返回所有已启用的板块 key */
export function enabledFeatures(
  siteConfig: Pick<SiteConfig, "features"> | undefined | null,
): Array<FeatureKey> {
  return ALL_FEATURE_KEYS.filter((key) => isFeatureEnabled(siteConfig, key));
}

/**
 * 路由守卫：板块关闭时抛 404。
 *
 * 用法（路由 beforeLoad 或 loader 里）：
 *   beforeLoad: ({ context }) => requireFeature(context.siteConfig, "moments")
 */
export function requireFeature(
  siteConfig: Pick<SiteConfig, "features"> | undefined | null,
  key: FeatureKey,
): void {
  if (!isFeatureEnabled(siteConfig, key)) {
    throw notFound();
  }
}
