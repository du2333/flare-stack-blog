import { invalidate } from "@/features/cache/public-cache";
import { systemConfig } from "@/features/config/config.cache";
import {
  resolveSiteConfig,
  resolveSystemConfig,
} from "@/features/config/config.resolve";
import type { SiteConfig, SystemConfig } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as Storage from "@/features/media/data/media.storage";

export { resolveSiteConfig, resolveSystemConfig };

export async function getSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return systemConfig.get(context, {});
}

export async function getSiteConfig(
  context: DbContext & { executionCtx: ExecutionContext },
): Promise<SiteConfig> {
  const config = await getSystemConfig(context);
  return resolveSiteConfig(config);
}

export async function updateSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
  data: SystemConfig,
) {
  const nextConfig = resolveSystemConfig(data);

  await ConfigRepo.upsertSystemConfig(context.db, nextConfig);
  await invalidate.siteConfigChanged(context);

  return { success: true };
}

export async function uploadSiteAsset(
  context: { env: Env },
  input: { file: File; assetPath: string },
): Promise<{ url: string }> {
  const { url } = await Storage.putSiteAsset(
    context.env,
    input.file,
    input.assetPath,
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const isFavicon = input.assetPath.startsWith("favicon/");
  const finalUrl = isFavicon
    ? `${url}?original=true&v=${timestamp}`
    : `${url}?v=${timestamp}`;

  return { url: finalUrl };
}
