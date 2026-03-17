import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as ConfigService from "@/features/config/service/config.service";
import { TestEmailConnectionSchema } from "@/features/email/email.schema";
import * as EmailService from "@/features/email/service/email.service";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/db/schema";
import {
  adminMiddleware,
  authMiddleware,
  dbMiddleware,
} from "@/lib/middlewares";

export const testEmailConnectionFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(TestEmailConnectionSchema)
  .handler(({ context, data }) =>
    EmailService.testEmailConnection(context, data),
  );

export const unsubscribeByTokenFn = createServerFn({
  method: "POST",
})
  .middleware([dbMiddleware])
  .inputValidator(
    z.object({
      userId: z.string(),
      type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
      token: z.string(),
    }),
  )
  .handler(({ context, data }) =>
    EmailService.unsubscribeByToken(context, data),
  );

export const getReplyNotificationStatusFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(({ context }) => {
    return EmailService.getReplyNotificationStatus(
      context,
      context.session.user.id,
    );
  });

export const getUserNotificationAvailabilityFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const config = await ConfigService.getSystemConfig(context);

    return {
      emailEnabled: config?.notification?.user?.emailEnabled ?? true,
    };
  });

export const toggleReplyNotificationFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(z.object({ enabled: z.boolean() }))
  .handler(({ context, data }) => {
    return EmailService.toggleReplyNotification(context, {
      userId: context.session.user.id,
      enabled: data.enabled,
    });
  });
