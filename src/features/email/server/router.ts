import { z } from "zod";
import * as ConfigService from "@/features/config/service/config.service";
import { TestEmailConnectionSchema } from "@/features/email/email.schema";
import * as EmailService from "@/features/email/service/email.service";
import * as AuthService from "@/features/auth/service/auth.service";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/db/schema";
import {
  adminProcedure,
  authProcedure,
  publicProcedure,
} from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const emailErrors = {
  SEND_FAILED: { status: 400, message: "Failed to send test email." },
  INVALID_OR_EXPIRED_TOKEN: {
    status: 400,
    message: "Unsubscribe token is invalid or expired.",
  },
  EMAIL_DISABLED: { status: 400, message: "Email notifications are disabled." },
} as const;

const configured = publicProcedure
  .route({
    method: "GET",
    path: "/email/configured",
    summary: "Check if email is configured",
    tags: ["Email"],
  })
  .handler(({ context }) => AuthService.getIsEmailConfigured(context));

const unsubscribe = publicProcedure
  .errors(emailErrors)
  .route({
    method: "POST",
    path: "/email/unsubscribe",
    summary: "Unsubscribe from email notifications",
    tags: ["Email"],
  })
  .input(
    z.object({
      userId: z.string(),
      type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
      token: z.string(),
    }),
  )
  .handler(({ context, input, errors }) =>
    unwrapResult(EmailService.unsubscribeByToken(context, input), {
      INVALID_OR_EXPIRED_TOKEN: () => {
        throw errors.INVALID_OR_EXPIRED_TOKEN();
      },
    }),
  );

const replyStatus = authProcedure
  .route({
    method: "GET",
    path: "/me/notifications/reply",
    summary: "Get reply notification status",
    tags: ["Email"],
  })
  .handler(({ context }) =>
    EmailService.getReplyNotificationStatus(context, context.session.user.id),
  );

const availability = authProcedure
  .route({
    method: "GET",
    path: "/me/notifications/availability",
    summary: "Get notification availability",
    tags: ["Email"],
  })
  .handler(async ({ context }) => {
    const config = await ConfigService.getSystemConfig(context);
    return {
      emailEnabled: config?.notification?.user?.emailEnabled ?? true,
    };
  });

const toggleReply = authProcedure
  .errors(emailErrors)
  .route({
    method: "PATCH",
    path: "/me/notifications/reply",
    summary: "Toggle reply notifications",
    tags: ["Email"],
  })
  .input(z.object({ enabled: z.boolean() }))
  .handler(({ context, input }) =>
    EmailService.toggleReplyNotification(context, {
      userId: context.session.user.id,
      enabled: input.enabled,
    }),
  );

const testConnection = adminProcedure
  .errors(emailErrors)
  .route({
    method: "POST",
    path: "/admin/email/test",
    summary: "Send a test email",
    tags: ["Admin Email"],
  })
  .input(TestEmailConnectionSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(EmailService.testEmailConnection(context, input), {
      SEND_FAILED: () => {
        throw errors.SEND_FAILED();
      },
    }),
  );

const hasPassword = authProcedure
  .route({
    method: "GET",
    path: "/me/has-password",
    summary: "Check if the current user has a password",
    tags: ["Auth"],
  })
  .handler(({ context }) => AuthService.userHasPassword(context));

export default {
  configured,
  unsubscribe,
  replyStatus,
  availability,
  toggleReply,
  testConnection,
  hasPassword,
};
