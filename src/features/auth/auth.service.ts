import { z } from "zod";
import * as AuthRepo from "@/features/auth/auth.data";
import * as UsersRepo from "@/features/auth/data/users.data";
import * as ConfigRepo from "@/features/config/config.data";
import * as CacheService from "@/features/cache/cache.service";

export async function getSession(context: SessionContext) {
  return context.session;
}

export async function userHasPassword(context: AuthContext) {
  return await AuthRepo.userHasPassword(context.db, context.session.user.id);
}

export async function getUserList(
  context: DbContext,
  data: { page?: number; limit?: number; search?: string },
) {
  return await UsersRepo.getUserList(context.db, data);
}

export async function getIsEmailConfigured(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return CacheService.get(
    context,
    ["isEmailConfigured"],
    z.boolean(),
    async () => {
      const config = await ConfigRepo.getSystemConfig(context.db);
      return !!(config?.email?.apiKey && config.email.senderAddress);
    },
  );
}
