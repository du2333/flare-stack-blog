import { ORPCError } from "@orpc/server";
import {
  UpdateConfigSectionSchema,
  type UpdateConfigSection,
  type AdminConfigSnapshot,
  type SecretChange,
  type SavedSecretInput,
} from "../config.admin.schema";
import { invalidate } from "@/features/cache/public-cache";
import { systemConfig } from "@/features/config/config.cache";
import {
  resolveSiteConfig,
  resolveSystemConfig,
} from "@/features/config/config.resolve";
import type { SiteConfig } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import {
  planSiteIcon,
  type SiteIconField,
  type SiteIconInfo,
  type SiteIconRejection,
  type SiteIconSize,
} from "@/features/config/utils/site-icon";
import * as Storage from "@/features/media/data/media.storage";
import { err, ok, type Result } from "@/lib/errors";
import {
  isWebhookEmpty,
  missingWebhookField,
  webhookSecretUse,
} from "@/features/webhook/webhook.providers";
import type {
  WebhookEndpoint,
  WebhookProvider,
} from "@/features/webhook/webhook.schema";

type UpdateNotifications = Extract<
  UpdateConfigSection,
  { section: "notifications" }
>;

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

export async function getAdminConfig(
  context: DbContext,
): Promise<AdminConfigSnapshot> {
  const snapshot = await ConfigRepo.getConfigSnapshot(context.db);
  return redactSnapshot(snapshot);
}
function redactSnapshot(
  snapshot: Awaited<ReturnType<typeof ConfigRepo.getConfigSnapshot>>,
): AdminConfigSnapshot {
  const config = snapshot.config;
  return {
    config: {
      ...config,
      email: {
        host: config.email?.host,
        port: config.email?.port,
        username: config.email?.username,
        senderName: config.email?.senderName,
        senderAddress: config.email?.senderAddress,
        password: "",
      },
      notification: {
        ...config.notification,
        webhook: {
          ...config.notification?.webhook,
          url: config.notification?.webhook?.url ?? "",
          secret: "",
        },
      },
    },
    revisions: {
      site: snapshot.siteRevision,
      notifications: snapshot.notificationRevision,
    },
    secrets: {
      emailPasswordConfigured: !!config.email?.password,
      webhookSecretConfigured: !!config.notification?.webhook?.secret,
    },
    schemaVersion: 1,
  };
}
function changeSecret(current: string | undefined, change: SecretChange) {
  return change.action === "keep"
    ? (current ?? "")
    : change.action === "clear"
      ? ""
      : change.value;
}
/**
 * The saved endpoint after an edit. The secret means something different per
 * channel (a signing key, a bot token), so a kept secret does not follow the
 * admin to another channel, and channels without one drop it.
 */
function nextWebhook(
  current: WebhookEndpoint | undefined,
  input: UpdateNotifications["notification"]["webhook"],
  secretChange: SecretChange,
): WebhookEndpoint {
  const currentProvider = current?.provider ?? "generic";
  const provider = input.provider ?? currentProvider;
  const secret =
    webhookSecretUse(provider) === "none" ||
    (secretChange.action === "keep" && provider !== currentProvider)
      ? ""
      : changeSecret(current?.secret, secretChange);
  const chatId = input.chatId ?? current?.chatId;
  const template = input.template ?? current?.template;
  return {
    ...(provider !== "generic" && { provider }),
    url: provider === "telegram" ? "" : input.url,
    secret,
    ...(chatId && { chatId }),
    ...(template && { template }),
  };
}
export async function updateSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
  input: UpdateConfigSection,
) {
  const data = UpdateConfigSectionSchema.parse(input);
  // Retry only unrelated-section races, always rebuilding from the latest row.
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await ConfigRepo.getConfigSnapshot(context.db);
    const revision =
      data.section === "site"
        ? current.siteRevision
        : current.notificationRevision;
    if (revision !== data.expectedRevision)
      throw new ORPCError("CONFIG_CONFLICT", { status: 409 });
    const nextConfig =
      data.section === "site"
        ? resolveSystemConfig({ ...current.config, site: data.site })
        : resolveSystemConfig({
            ...current.config,
            email: {
              ...data.email,
              password: changeSecret(
                current.config.email?.password,
                data.secrets.emailPassword,
              ),
            },
            notification: {
              ...data.notification,
              webhook: nextWebhook(
                current.config.notification?.webhook,
                data.notification.webhook,
                data.secrets.webhookSecret,
              ),
            },
          });
    if (data.section === "notifications") {
      const email = nextConfig.email!;
      const endpoint = nextConfig.notification!.webhook!;
      // A cleared/unconfigured password is allowed; a usable credential requires a complete account.
      if (
        email.password &&
        !(email.host && email.username && email.senderAddress)
      )
        throw new ORPCError("CONFIG_INVALID", {
          status: 400,
          data: { field: "email" },
        });
      // Empty turns notifications off; anything entered must be complete.
      const missing = isWebhookEmpty(endpoint)
        ? null
        : missingWebhookField(endpoint);
      if (missing)
        throw new ORPCError("CONFIG_INVALID", {
          status: 400,
          data: { field: `notification.webhook.${missing}` },
        });
    }
    if (
      !(await ConfigRepo.compareAndSetConfig(
        context.db,
        current,
        nextConfig,
        data.section,
      ))
    )
      continue;
    await invalidate.siteConfigChanged(context);
    return redactSnapshot({
      config: nextConfig,
      siteRevision: current.siteRevision + (data.section === "site" ? 1 : 0),
      notificationRevision:
        current.notificationRevision +
        (data.section === "notifications" ? 1 : 0),
    });
  }
  throw new ORPCError("CONFIG_CONFLICT", { status: 409 });
}
export async function resolveTestSecret(
  context: DbContext,
  kind: "emailPassword" | "webhookSecret",
  input: SavedSecretInput,
  provider: WebhookProvider = "generic",
) {
  if (input.action === "replace") return input.value;
  const current = await ConfigRepo.getConfigSnapshot(context.db);
  if (current.notificationRevision !== input.expectedRevision)
    throw new ORPCError("CONFIG_CONFLICT", { status: 409 });
  const webhook = current.config.notification?.webhook;
  // A saved secret belongs to the channel it was saved for.
  if (kind === "webhookSecret" && (webhook?.provider ?? "generic") !== provider)
    throw new ORPCError("CONFIG_INVALID", { status: 400 });
  const value =
    kind === "emailPassword" ? current.config.email?.password : webhook?.secret;
  if (!value) throw new ORPCError("CONFIG_INVALID", { status: 400 });
  return value;
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
  return { url: siteAssetAddress(url, input.assetPath) };
}

/**
 * The address a stored site asset is saved under: the version busts caches,
 * and a favicon is served as stored.
 */
function siteAssetAddress(url: string, assetPath: string) {
  const version = Math.floor(Date.now() / 1000);
  return assetPath.startsWith("favicon/")
    ? `${url}?original=true&v=${version}`
    : `${url}?v=${version}`;
}

export type SiteIconUpload = {
  icons: Record<SiteIconField, string>;
  /** False when the sizes could not be made and each holds the original. */
  resized: boolean;
};

export type SiteIconError =
  | SiteIconRejection
  | { reason: "SITE_ICON_UNREADABLE" }
  | { reason: "SITE_ICON_STORE_FAILED" };

/**
 * Stores one square PNG or JPEG as the site's raster icons: the Images binding
 * makes a PNG of each size at upload, and requests read them from R2 as they
 * are. When making them fails (the transform quota, error 9422, or any other
 * transform error) the original is stored at every path instead, so the upload
 * still lands, and `resized` says so.
 */
export async function uploadSiteIcon(
  context: { env: Env },
  input: { file: File },
): Promise<Result<SiteIconUpload, SiteIconError>> {
  const { env } = context;
  const { file } = input;

  // `info()` is not billed. Each binding call consumes its stream, so every
  // call reads the file afresh.
  let info: SiteIconInfo;
  try {
    info = await env.IMAGES.info(file.stream());
  } catch (error) {
    logIconError("site icon info error", error);
    return err({ reason: "SITE_ICON_UNREADABLE" });
  }
  const plan = planSiteIcon(info);
  if (plan.error) return plan;

  let outputs: Array<{ target: SiteIconSize; file: File }>;
  let resized = true;
  try {
    outputs = await Promise.all(
      plan.data.map(async (target) => {
        const result = await env.IMAGES.input(file.stream())
          .transform({ width: target.size, height: target.size, fit: "cover" })
          .output({ format: "image/png" });
        const bytes = await result.response().arrayBuffer();
        const png = new File([bytes], `${target.field}.png`, {
          type: "image/png",
        });
        return { target, file: png };
      }),
    );
  } catch (error) {
    logIconError("site icon transform error", error);
    outputs = plan.data.map((target) => ({ target, file }));
    resized = false;
  }

  // A failed write may leave some paths replaced; the saved addresses stay as
  // they were until the config is saved, and the Admin uploads again.
  try {
    const stored = await Promise.all(
      outputs.map(async ({ target, file: output }) => {
        const { url } = await Storage.putSiteAsset(env, output, target.path);
        return [target.field, siteAssetAddress(url, target.path)] as const;
      }),
    );
    return ok({
      icons: Object.fromEntries(stored) as Record<SiteIconField, string>,
      resized,
    });
  } catch (error) {
    logIconError("site icon store error", error);
    return err({ reason: "SITE_ICON_STORE_FAILED" });
  }
}

function logIconError(message: string, error: unknown) {
  console.error(
    JSON.stringify({
      message,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}
