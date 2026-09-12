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
        webhook: { url: config.notification?.webhook?.url ?? "", secret: "" },
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
              webhook: {
                url: data.notification.webhook.url,
                secret: changeSecret(
                  current.config.notification?.webhook?.secret,
                  data.secrets.webhookSecret,
                ),
              },
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
      if (endpoint.url && !endpoint.secret)
        throw new ORPCError("CONFIG_INVALID", {
          status: 400,
          data: { field: "notification.webhook.secret" },
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
) {
  if (input.action === "replace") return input.value;
  const current = await ConfigRepo.getConfigSnapshot(context.db);
  if (current.notificationRevision !== input.expectedRevision)
    throw new ORPCError("CONFIG_CONFLICT", { status: 409 });
  const value =
    kind === "emailPassword"
      ? current.config.email?.password
      : current.config.notification?.webhook?.secret;
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

  const timestamp = Math.floor(Date.now() / 1000);
  const isFavicon = input.assetPath.startsWith("favicon/");
  const finalUrl = isFavicon
    ? `${url}?original=true&v=${timestamp}`
    : `${url}?v=${timestamp}`;

  return { url: finalUrl };
}
