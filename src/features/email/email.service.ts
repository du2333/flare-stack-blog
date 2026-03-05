import type { EmailUnsubscribeType } from "@/lib/db/schema";
import type { TestEmailConnectionInput } from "@/features/email/email.schema";
import * as EmailData from "@/features/email/data/email.data";
import { getSystemConfig } from "@/features/config/config.data";
import {
  createEmailClient,
  verifyUnsubscribeToken,
} from "@/features/email/email.utils";
import { err, ok } from "@/lib/errors";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";

export async function testEmailConnection(
  context: DbContext,
  data: TestEmailConnectionInput,
) {
  try {
    const { ADMIN_EMAIL } = serverEnv(context.env);
    const { apiKey, senderAddress, senderName } = data;
    const resend = createEmailClient({ apiKey });

    const result = await resend.emails.send({
      from: senderName ? `${senderName} <${senderAddress}>` : senderAddress,
      to: ADMIN_EMAIL, // 发送给自己进行测试
      subject: "测试连接 - Test Connection",
      html: "<p>这是一个测试邮件</p>",
    });

    if (result.error) {
      return err({ reason: "SEND_FAILED", message: result.error.message });
    }

    return ok({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
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
  context: DbContext,
  options: {
    to: string;
    subject: string;
    html: string;
    headers?: Record<string, string>;
    idempotencyKey?: string;
  },
) {
  if (isNotInProduction(context.env)) {
    console.log(
      `[EMAIL_SERVICE] 开发环境跳过发送至 ${options.to} 的邮件：${options.subject}:\n${options.html}`,
    );
    return ok({ success: true });
  }

  const config = await getSystemConfig(context.db);
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
    return err({
      reason: "SEND_FAILED",
      message: error instanceof Error ? error.message : "未知错误",
    });
  }

  return ok({ success: true });
}
