import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as AuthService from "@/features/auth/auth.service";
import {
  adminMiddleware,
  authMiddleware,
  dbMiddleware,
  sessionMiddleware,
} from "@/lib/middlewares";

export const getSessionFn = createServerFn()
  .middleware([sessionMiddleware])
  .handler(({ context }) => AuthService.getSession(context));

export const userHasPasswordFn = createServerFn()
  .middleware([authMiddleware])
  .handler(({ context }) => AuthService.userHasPassword(context));

export const getIsEmailConfiguredFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => AuthService.getIsEmailConfigured(context));

// ─── Admin: 用户列表 ─────────────────────────────────

const GetUserListInputSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
});

export const getUserListFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetUserListInputSchema)
  .handler(({ data, context }) => AuthService.getUserList(context, data));
