import * as ConfigService from "@/features/config/service/config.service";
import * as EmailData from "@/features/email/data/email.data";
import type { TestEmailConnectionInput } from "@/features/email/email.schema";
import {
  createEmailClientFactory,
  verifyUnsubscribeToken,
} from "@/features/email/email.utils";
import type { EmailUnsubscribeType } from "@/lib/db/schema";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";
import { m } from "@/paraglide/messages";

// ---------------------------------------------------------------------------
// Test email connection
// ---------------------------------------------------------------------------

export async function testEmailConnection(
  context: DbContext,
  data: TestEmailConnectionInput,
) {
  try {
    const { ADMIN_EMAIL, LOCALE } = serverEnv(context.env);
    const client = createEmailClientFactory(data.provider, {
      apiKey: data.apiKey,
      domain: data.domain,
      serverId: data.serverId,
    });

    const from = data.senderName
      ? `${data.senderName} <${data.senderAddress}>`
      : data.senderAddress;

    const result = await client.send({
      from,
      to: ADMIN_EMAIL,
      subject: m.settings_email_test_mail_subject({}, { locale: LOCALE }),
      html: `<p>${m.settings_email_test_mail_body({}, { locale: LOCALE })}</p>`,
    });

    if (result.error) {
      return err({ reason: "SEND_FAILED", message: result.error.message });
    }

    return ok({ success: true });
  } catch (error) {
    const locale = serverEnv(context.env).LOCALE;
    const errorMessage =
      error instanceof Error
        ? error.message
        : m.settings_email_unknown_error({}, { locale });
    return err({ reason: "SEND_FAILED", message: errorMessage });
  }
}

// ---------------------------------------------------------------------------
// Unsubscribe by token
// ---------------------------------------------------------------------------

export async function unsubscribeByToken(
  context: DbContext,
  data: {
    userId: string;
    type: EmailUnsubscribeType;
    token: string;
  },
) {
  const { BETTER_AUTH_SECRET } = serverEnv(context.env);
  const isValid = await verifyUnsubscribeToken(
    BETTER_AUTH_SECRET,
    data.userId,
    data.type,
    data.token,
  );

  if (!isValid) {
    return err({ reason: "INVALID_OR_EXPIRED_TOKEN" });
  }

  await EmailData.unsubscribe(context.db, data.userId, data.type);
  return ok({ success: true });
}

// ---------------------------------------------------------------------------
// Reply notification status
// ---------------------------------------------------------------------------

export async function getReplyNotificationStatus(
  context: DbContext,
  userId: string,
) {
  const unsubscribed = await EmailData.isUnsubscribed(
    context.db,
    userId,
    "reply_notification",
  );
  return { enabled: !unsubscribed };
}

// ---------------------------------------------------------------------------
// Notification config
// ---------------------------------------------------------------------------

export async function getNotificationConfig(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const config = await ConfigService.getSystemConfig(context);

  return {
    userEmailEnabled: config?.notification?.user?.emailEnabled ?? true,
  };
}

export async function toggleReplyNotification(
  context: DbContext,
  data: { userId: string; enabled: boolean },
) {
  if (data.enabled) {
    await EmailData.subscribe(context.db, data.userId, "reply_notification");
  } else {
    await EmailData.unsubscribe(context.db, data.userId, "reply_notification");
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Send email — routes to the configured provider
// ---------------------------------------------------------------------------

export async function sendEmail(
  context: DbContext & { executionCtx: ExecutionContext },
  options: {
    to: string;
    subject: string;
    html: string;
    headers?: Record<string, string>;
    idempotencyKey?: string;
    unsubscribe?: {
      userId: string;
      type: EmailUnsubscribeType;
    };
  },
) {
  // Check unsubscribe status
  if (options.unsubscribe) {
    const unsubscribed = await EmailData.isUnsubscribed(
      context.db,
      options.unsubscribe.userId,
      options.unsubscribe.type,
    );

    if (unsubscribed) {
      console.log(
        JSON.stringify({
          event: "email_skipped",
          reason: "user_unsubscribed",
          to: options.to,
          userId: options.unsubscribe.userId,
          type: options.unsubscribe.type,
        }),
      );
      return ok({ success: true });
    }
  }

  // Skip in dev/test
  if (isNotInProduction(context.env)) {
    console.log(
      `[EMAIL_SERVICE] 开发环境跳过发送至 ${options.to} 的邮件：${options.subject}:\n${options.html}`,
    );
    return ok({ success: true });
  }

  const config = await ConfigService.getSystemConfig(context);
  const email = config?.email;

  if (!email) {
    console.warn(`[EMAIL_SERVICE] 邮件配置为空，跳过发送至: ${options.to}`);
    return err({ reason: "EMAIL_DISABLED" });
  }

  const provider = email.provider ?? "resend";
  const from = email.senderName
    ? `${email.senderName} <${email.senderAddress}>`
    : email.senderAddress;

  // Build provider config
  let providerConfig: { apiKey?: string; domain?: string; serverId?: number } = {};
  switch (provider) {
    case "resend":
      providerConfig = { apiKey: email.resend?.apiKey };
      break;
    case "postmark":
      providerConfig = { apiKey: email.postmark?.apiKey, serverId: email.postmark?.serverId };
      break;
    case "mailgun":
      providerConfig = { apiKey: email.mailgun?.apiKey, domain: email.mailgun?.domain };
      break;
    case "sendgrid":
      providerConfig = { apiKey: email.sendgrid?.apiKey };
      break;
    case "mandrill":
      providerConfig = { apiKey: email.mandrill?.apiKey };
      break;
  }

  if (!providerConfig.apiKey || !email.senderAddress) {
    console.warn(
      `[EMAIL_SERVICE] provider=${provider} 配置不完整（apiKey 或 senderAddress 缺失），跳过发送至: ${options.to}`,
    );
    return err({ reason: "EMAIL_DISABLED" });
  }

  try {
    const client = createEmailClientFactory(provider, providerConfig);

    const result = await client.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      headers: options.headers,
    });

    if (result.error) {
      return err({ reason: "SEND_FAILED", message: result.error.message });
    }

    return ok({ success: true });
  } catch (error) {
    const locale = serverEnv(context.env).LOCALE;
    return err({
      reason: "SEND_FAILED",
      message:
        error instanceof Error
          ? error.message
          : m.settings_email_unknown_error({}, { locale }),
    });
  }
}
