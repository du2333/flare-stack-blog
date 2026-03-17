import { blogConfig } from "@/blog.config";
import * as CacheService from "@/features/cache/cache.service";
import type { SiteConfig, SystemConfig } from "@/features/config/config.schema";
import {
  CONFIG_CACHE_KEYS,
  DEFAULT_CONFIG,
  SystemConfigSchema,
} from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import { FullSiteConfigSchema } from "@/features/config/site-config.schema";
import * as Storage from "@/features/media/data/media.storage";
import { purgeSiteCDNCache } from "@/lib/invalidate";

export function resolveSystemConfig(
  config: SystemConfig | null | undefined,
): SystemConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    email: {
      ...DEFAULT_CONFIG.email,
      ...config?.email,
    },
    notification: {
      ...DEFAULT_CONFIG.notification,
      ...config?.notification,
      admin: {
        ...DEFAULT_CONFIG.notification?.admin,
        ...config?.notification?.admin,
        channels: {
          ...DEFAULT_CONFIG.notification?.admin?.channels,
          ...config?.notification?.admin?.channels,
        },
      },
      user: {
        ...DEFAULT_CONFIG.notification?.user,
        ...config?.notification?.user,
      },
      webhooks:
        config?.notification?.webhooks ?? DEFAULT_CONFIG.notification?.webhooks,
    },
    site: resolveSiteConfig(config),
  };
}

export function resolveSiteConfig(
  config: SystemConfig | null | undefined,
): SiteConfig {
  const configDefaultBackground = config?.site?.theme?.default?.background;

  return FullSiteConfigSchema.parse({
    title: config?.site?.title ?? blogConfig.title,
    author: config?.site?.author ?? blogConfig.author,
    description: config?.site?.description ?? blogConfig.description,
    social: {
      github: config?.site?.social?.github ?? blogConfig.social.github,
      email: config?.site?.social?.email ?? blogConfig.social.email,
    },
    icons: {
      faviconSvg:
        config?.site?.icons?.faviconSvg || blogConfig.icons.faviconSvg,
      faviconIco:
        config?.site?.icons?.faviconIco || blogConfig.icons.faviconIco,
      favicon96: config?.site?.icons?.favicon96 || blogConfig.icons.favicon96,
      appleTouchIcon:
        config?.site?.icons?.appleTouchIcon || blogConfig.icons.appleTouchIcon,
      webApp192: config?.site?.icons?.webApp192 || blogConfig.icons.webApp192,
      webApp512: config?.site?.icons?.webApp512 || blogConfig.icons.webApp512,
    },
    theme: {
      default: {
        navBarName:
          config?.site?.theme?.default?.navBarName ??
          blogConfig.theme.default.navBarName,
        background: configDefaultBackground
          ? {
              homeImage: configDefaultBackground.homeImage ?? "",
              globalImage: configDefaultBackground.globalImage ?? "",
              light: {
                opacity: configDefaultBackground.light?.opacity ?? 0.15,
              },
              dark: {
                opacity: configDefaultBackground.dark?.opacity ?? 0.1,
              },
              backdropBlur: configDefaultBackground.backdropBlur ?? 8,
              transitionDuration:
                configDefaultBackground.transitionDuration ?? 600,
            }
          : undefined,
      },
      fuwari: {
        homeBg:
          config?.site?.theme?.fuwari?.homeBg ?? blogConfig.theme.fuwari.homeBg,
        avatar:
          config?.site?.theme?.fuwari?.avatar ?? blogConfig.theme.fuwari.avatar,
        primaryHue:
          config?.site?.theme?.fuwari?.primaryHue ??
          blogConfig.theme.fuwari.primaryHue,
      },
    },
  });
}

function hasSiteConfigChanged(
  currentConfig: SystemConfig | null | undefined,
  nextConfig: SystemConfig | null | undefined,
) {
  return (
    JSON.stringify(resolveSiteConfig(currentConfig)) !==
    JSON.stringify(resolveSiteConfig(nextConfig))
  );
}

export async function getSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return await CacheService.get(
    context,
    CONFIG_CACHE_KEYS.system,
    SystemConfigSchema,
    async () =>
      resolveSystemConfig(await ConfigRepo.getSystemConfig(context.db)),
  );
}

export async function getSiteConfig(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const config = await getSystemConfig(context);
  return resolveSiteConfig(config);
}

export async function updateSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
  data: SystemConfig,
) {
  const currentConfig = await ConfigRepo.getSystemConfig(context.db);
  const nextConfig = resolveSystemConfig(data);

  await ConfigRepo.upsertSystemConfig(context.db, nextConfig);
  await CacheService.deleteKey(context, CONFIG_CACHE_KEYS.system);

  if (hasSiteConfigChanged(currentConfig, nextConfig)) {
    await purgeSiteCDNCache(context.env);
  }

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
