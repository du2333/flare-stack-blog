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
      },
    },
  });
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
  context: DbContext,
  data: SystemConfig,
) {
  await ConfigRepo.upsertSystemConfig(context.db, resolveSystemConfig(data));
  await CacheService.deleteKey(context, CONFIG_CACHE_KEYS.system);

  return { success: true };
}
