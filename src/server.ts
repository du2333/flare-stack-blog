import { WorkerEntrypoint } from "cloudflare:workers";
import handler from "@tanstack/react-start/server-entry";
import { applyWorkersCachePurge } from "@/features/cache/workers-cache";
import {
  applyWorkersCachePolicy,
  workersCacheRoute,
  type WorkersCachePurgeTarget,
} from "@/features/cache/workers-cache-policy";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import { getDb } from "@/lib/db";
import { isRoutedPath, probeNotFoundResponse } from "@/lib/probe-404";
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

  async purgeCache(target: WorkersCachePurgeTarget) {
    const { cache } = await import("cloudflare:workers");
    await applyWorkersCachePurge(this.ctx.cache ?? cache, target);
  }
}

export default {
  async fetch(request, _env, ctx) {
    // Scanner probes would each cost an SSR render, so answer them here.
    if (!isRoutedPath(new URL(request.url).pathname)) {
      return probeNotFoundResponse(request);
    }
    const locale = extractLocaleFromRequest(request);
    const app = ctx.exports.App({ props: { locale } });
    const route = workersCacheRoute(request, __BUILD_ID__);
    if (route.cache === "bypass") {
      // A Theme preview: neither read from the cache nor stored in it.
      return app.fetch(route.request, { cache: "no-store" });
    }
    return app.fetch(route.request, {
      cf: { cacheKey: route.cacheKey },
    });
  },
  async queue(batch, env, ctx) {
    await handleQueueBatch(batch, env, ctx);
  },
  async scheduled(_controller, env, ctx) {
    const result = await postPopularityService.sync({
      env,
      db: getDb(env),
      executionCtx: ctx,
    });
    if (result.error) throw new Error("Post popularity sync failed");
  },
} satisfies ExportedHandler<Env>;
