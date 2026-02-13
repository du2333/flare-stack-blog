import type { TestEmailConnectionInput } from "@/features/email/email.schema";
import { getSystemConfig } from "@/features/config/config.data";
import { createEmailClient } from "@/features/email/email.utils";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";

export async function testEmailConnection(
  context: DbContext,
  data: TestEmailConnectionInput,
): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: errorMessage };
  }
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
    return { status: "SUCCESS" as const };
  }

  const config = await getSystemConfig(context.db);
  const email = config?.email;

  if (!email?.apiKey || !email.senderAddress) {
    console.warn(`[EMAIL_SERVICE] 未配置邮件服务，跳过发送至: ${options.to}`);
    return { status: "DISABLED" as const };
  }

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
    return { status: "FAILED" as const, error: result.error.message };
  }

  return { status: "SUCCESS" as const };
}
