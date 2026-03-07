import { z } from "zod";
import * as AuthRepo from "@/features/auth/data/auth.data";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as CacheService from "@/features/cache/cache.service";

export async function getSession(context: SessionContext) {
  return context.session;
}

export async function userHasPassword(context: AuthContext) {
  return await AuthRepo.userHasPassword(context.db, context.session.user.id);
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
