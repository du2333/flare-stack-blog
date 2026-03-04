import type { EmailMessage } from "@/lib/queue/queue.schema";
import { sendEmail } from "@/features/email/email.service";
import { getDb } from "@/lib/db";

export async function handleEmailMessage(
  env: Env,
  data: EmailMessage["data"],
): Promise<void> {
  const db = getDb(env);
  const result = await sendEmail({ db, env }, data);

  if (result.error) {
    const reason = result.error.reason;
    switch (reason) {
      case "SEND_FAILED":
        throw new Error(`邮件发送失败: ${result.error.message}`);
      case "EMAIL_DISABLED":
        console.log(`[Email] 邮件服务未启用，跳过: ${data.to}`);
        return;
      default: {
        reason satisfies never;
      }
    }
  }
}
