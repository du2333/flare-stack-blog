import type { EmailMessage } from "@/lib/queue/queue.schema";
import { sendEmail } from "@/features/email/email.service";
import { getDb } from "@/lib/db";

export async function handleEmailMessage(
  data: EmailMessage["data"],
  env: Env,
): Promise<void> {
  const db = getDb(env);
  const result = await sendEmail({ db, env }, data);

  if (result.status === "FAILED") {
    throw new Error(`邮件发送失败: ${result.error}`);
  }

  if (result.status === "DISABLED") {
    console.log(`[Email] 邮件服务未启用，跳过: ${data.to}`);
  }
}
