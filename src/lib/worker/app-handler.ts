import { app } from "@/lib/hono/routes";
import { paraglideMiddleware } from "@/paraglide/server";

export const appWorkerHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return paraglideMiddleware(request, () => app.fetch(request, env, ctx));
  },
};
