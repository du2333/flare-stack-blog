import { createServerFn } from "@tanstack/react-start";
import * as AuthService from "@/features/auth/service/auth.service";
import {
  authMiddleware,
  dbMiddleware,
  sessionMiddleware,
} from "@/lib/middlewares";

export const getSessionFn = createServerFn()
  .middleware([sessionMiddleware])
  .handler(({ context }) => AuthService.getSession(context));

export const userHasPasswordFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => await AuthService.userHasPassword(context));

export const getIsEmailConfiguredFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => AuthService.getIsEmailConfigured(context));
