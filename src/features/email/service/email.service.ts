import * as ConfigService from "@/features/config/service/config.service";
import * as EmailData from "@/features/email/data/email.data";
import type { TestEmailConnectionInput } from "@/features/email/email.schema";
import {
  createEmailClient,
  verifyUnsubscribeToken,
} from "@/features/email/email.utils";
import type { EmailUnsubscribeType } from "@/lib/db/schema";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";
import { m } from "@/paraglide/messages";

export async function testEmailConnection(
  context: DbContext,
  data: TestEmailConnectionInput,
) {
  try {
    const { ADMIN_EMAIL, LOCALE } = serverEnv(context.env);
    const { apiKey, senderAddress, senderName } = data;
    const resend = createEmailClient({ apiKey });

    const result = await resend.emails.send({
      from: senderName ? `${senderName} <${senderAddress}>` : senderAddress,
      to: ADMIN_EMAIL, // 发送给自己进行测试
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

  if (isNotInProduction(context.env)) {
    console.log(
      `[EMAIL_SERVICE] 开发环境跳过发送至 ${options.to} 的邮件：${options.subject}:\n${options.html}`,
    );
    return ok({ success: true });
  }

  const config = await ConfigService.getSystemConfig(context);
  const email = config?.email;

  if (!email?.apiKey || !email.senderAddress) {
    console.warn(`[EMAIL_SERVICE] 未配置邮件服务，跳过发送至: ${options.to}`);
    return err({ reason: "EMAIL_DISABLED" });
  }

  try {
    const resend = createEmailClient({ apiKey: email.apiKey });

    const result = await resend.emails.send(
      {
        from: email.senderName
          ? `${email.senderName} <${email.senderAddress}>`
          : email.senderAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: options.headers,
      },
      {
        idempotencyKey: options.idempotencyKey,
      },
    );

    if (result.error) {
      return err({ reason: "SEND_FAILED", message: result.error.message });
    }
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

  return ok({ success: true });
}
