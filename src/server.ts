import { WorkerEntrypoint } from "cloudflare:workers";
import handler from "@tanstack/react-start/server-entry";
import {
  applyWorkersCachePolicy,
  workersCacheKey,
} from "@/features/cache/workers-cache-policy";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import { getDb } from "@/lib/db";
import { handleQueueBatch } from "@/lib/queue/queue.handler";
import { extractLocaleFromRequest } from "@/paraglide/runtime";
import { paraglideMiddleware } from "@/paraglide/server";

export { PostPublisher } from "@/lib/do/post-publisher";
export { RateLimiter } from "@/lib/do/rate-limiter";

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
        env: Env;
        executionCtx: ExecutionContext<unknown>;
      };
    };
  }
}

type AppProps = {
  locale: string;
};

export class App extends WorkerEntrypoint<Env, AppProps> {
  async fetch(request: Request) {
    const response = await paraglideMiddleware(request, () =>
      handler.fetch(request, {
        context: {
          env: this.env,
          executionCtx: this.ctx,
        },
      }),
    );
    return applyWorkersCachePolicy(request, response);
  }
}

export default {
  async fetch(request, _env, ctx) {
    const locale = extractLocaleFromRequest(request);
    return ctx.exports.App({ props: { locale } }).fetch(request, {
      cf: { cacheKey: workersCacheKey(request.url) },
    });
  },
  async queue(batch, env, ctx) {
    await handleQueueBatch(batch, env, ctx);
  },
  async scheduled(_controller, env) {
    const result = await postPopularityService.sync({ env, db: getDb(env) });
    if (result.error) throw new Error("Post popularity sync failed");
  },
} satisfies ExportedHandler<Env>;
