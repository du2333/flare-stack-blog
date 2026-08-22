import handler from "@tanstack/react-start/server-entry";
import { handleQueueBatch } from "@/lib/queue/queue.handler";
import { paraglideMiddleware } from "@/paraglide/server";

export { CommentModerationWorkflow } from "@/features/comments/workflows/comment-moderation";
export { ExportWorkflow } from "@/features/import-export/workflows/export.workflow";
export { ImportWorkflow } from "@/features/import-export/workflows/import.workflow";
export { PostProcessWorkflow } from "@/features/posts/workflows/post-process";
export { PasswordHasher } from "@/lib/do/password-hasher";
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

export default {
  async fetch(request, env, ctx) {
    return paraglideMiddleware(request, () =>
      handler.fetch(request, {
        context: {
          env,
          executionCtx: ctx,
        },
      }),
    );
  },
  async queue(batch, env, ctx) {
    await handleQueueBatch(batch, env, ctx);
  },
} satisfies ExportedHandler<Env>;
