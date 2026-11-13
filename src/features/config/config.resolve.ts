import { blogConfig } from "@/blog.config";
import type { SiteConfig, SystemConfig } from "@/features/config/config.schema";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import type { z } from "zod";
import {
  AvatarSchema,
  BannerFocusSchema,
  BannerImageSchema,
  BrandMarkSchema,
  DEFAULT_THEME_ID,
  FullSiteConfigSchema,
  isThemeId,
  PrimaryHueSchema,
  TaglineSchema,
  ThemeOptionValueSchema,
} from "@/features/config/site-config.schema";
import { normalizeNavLinks } from "@/features/config/utils/nav-links";
import type { SocialLink } from "@/features/config/utils/social-platforms";
import type { WebhookEndpoint } from "@/features/webhook/webhook.schema";

const DEFAULT_SMTP_PORT = 465;
const RESEND_SMTP_HOST = "smtp.resend.com";
const RESEND_SMTP_USERNAME = "resend";

function resolveEmailConfig(config: SystemConfig | null | undefined) {
  const email = config?.email;
  const legacyApiKey = email?.apiKey?.trim() || "";
  const password = email?.password || legacyApiKey;
  const host = email?.host?.trim() || (legacyApiKey ? RESEND_SMTP_HOST : "");
  const username =
    email?.username?.trim() || (legacyApiKey ? RESEND_SMTP_USERNAME : "");

  return {
    host,
    port: email?.port ?? DEFAULT_SMTP_PORT,
    username,
    password,
    senderName: email?.senderName ?? "",
    senderAddress: email?.senderAddress ?? "",
  };
}

function migrateSocial(social: unknown): SocialLink[] {
  if (Array.isArray(social)) return social;

  if (social && typeof social === "object") {
    const old = social as { github?: string; email?: string };
    const migrated: SocialLink[] = [];
    if (old.github) migrated.push({ platform: "github", url: old.github });
    if (old.email)
      migrated.push({ platform: "email", url: `mailto:${old.email}` });
    return migrated;
  }

  return [...blogConfig.social];
}

/** The first candidate the schema accepts, or the fallback. */
function firstValid<T>(
  schema: z.ZodType<T>,
  candidates: Array<unknown>,
  fallback: T,
): T {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const parsed = schema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Each Theme reads its own options, so only their shape is checked here, and
 * an unreadable entry is dropped instead of failing the whole Site Config.
 */
function resolveThemeOptions(value: unknown): SiteConfig["theme"]["options"] {
  if (!isPlainObject(value)) return {};
  // Entries, not assignment, so a stored "__proto__" key stays a plain key.
  const themes: Array<[string, SiteConfig["theme"]["options"][string]]> = [];
  for (const [id, options] of Object.entries(value)) {
    if (!isPlainObject(options)) continue;
    const readable: Array<[string, z.infer<typeof ThemeOptionValueSchema>]> =
      [];
    for (const [key, option] of Object.entries(options)) {
      const parsed = ThemeOptionValueSchema.safeParse(option);
      if (parsed.success) readable.push([key, parsed.data]);
    }
    themes.push([id, Object.fromEntries(readable)]);
  }
  return Object.fromEntries(themes);
}

/**
 * The banner image, avatar and hue used to live under `theme.fuwari`. A
 * document without the shared field still has them there.
 */
function resolveSharedFields(site: SystemConfig["site"]) {
  const legacy = site?.theme?.fuwari;
  return {
    bannerImage: firstValid(
      BannerImageSchema,
      [site?.bannerImage, legacy?.homeBg],
      blogConfig.bannerImage,
    ),
    bannerFocus: firstValid(BannerFocusSchema, [site?.bannerFocus], {
      ...blogConfig.bannerFocus,
    }),
    avatar: firstValid(
      AvatarSchema,
      [site?.avatar, legacy?.avatar],
      blogConfig.avatar,
    ),
    primaryHue: firstValid(
      PrimaryHueSchema,
      [site?.primaryHue, legacy?.primaryHue],
      blogConfig.primaryHue,
    ),
    brandMark: firstValid(
      BrandMarkSchema,
      [site?.brandMark],
      blogConfig.brandMark,
    ),
    tagline: firstValid(TaglineSchema, [site?.tagline], blogConfig.tagline),
  };
}

export function resolveSiteConfig(
  config: SystemConfig | null | undefined,
): SiteConfig {
  const shared = resolveSharedFields(config?.site);
  const themeId = config?.site?.theme?.id;
  return FullSiteConfigSchema.parse({
    title: config?.site?.title ?? blogConfig.title,
    author: config?.site?.author ?? blogConfig.author,
    description: config?.site?.description ?? blogConfig.description,
    social: migrateSocial(config?.site?.social),
    navLinks: normalizeNavLinks(config?.site?.navLinks),
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
    ...shared,
    theme: {
      // A Theme this build does not offer is read as the default, not an error.
      id: isThemeId(themeId) ? themeId : DEFAULT_THEME_ID,
      options: resolveThemeOptions(config?.site?.theme?.options),
      // Copy for builds that still read `theme.fuwari`, so rolling back keeps
      // the banner, avatar and hue. Drop it one release after the shared fields.
      fuwari: {
        homeBg: shared.bannerImage,
        avatar: shared.avatar,
        primaryHue: shared.primaryHue,
      },
    },
  });
}

function resolveWebhookEndpoint(
  notification: SystemConfig["notification"] | null | undefined,
): WebhookEndpoint {
  const current = notification?.webhook;
  const currentUrl = current?.url?.trim() ?? "";
  const currentSecret = current?.secret ?? "";
  const provider = current?.provider ?? "generic";
  if (currentUrl || provider !== "generic") {
    return {
      ...(provider !== "generic" && { provider }),
      url: currentUrl,
      secret: currentSecret,
      ...(current?.chatId && { chatId: current.chatId }),
      ...(current?.template && { template: current.template }),
    };
  }

  const legacy = notification?.webhooks?.[0];
  if (legacy) {
    return {
      url: legacy.url?.trim() ?? "",
      secret: legacy.secret ?? currentSecret,
    };
  }

  return {
    url: "",
    secret: currentSecret,
  };
}

export function resolveSystemConfig(
  config: SystemConfig | null | undefined,
): SystemConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    email: resolveEmailConfig(config),
    notification: {
      admin: {
        channels: {
          email: config?.notification?.admin?.channels?.email ?? true,
        },
      },
      user: {
        emailEnabled: config?.notification?.user?.emailEnabled ?? true,
      },
      webhook: resolveWebhookEndpoint(config?.notification),
    },
    site: resolveSiteConfig(config),
  };
}
