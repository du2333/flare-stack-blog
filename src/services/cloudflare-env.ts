import { Context, Layer } from "effect";

export class CloudflareEnvService extends Context.Tag(
  "./services/cloudflare-env/CloudflareEnv",
)<CloudflareEnvService, { env: Env }>() {
  static Live = (env: Env) => Layer.succeed(this, { env });
}

export class CloudflareExecutionContextService extends Context.Tag(
  "./services/cloudflare-env/CloudflareExecutionContextService",
)<CloudflareExecutionContextService, { executionCtx: ExecutionContext }>() {
  static Live = (executionCtx: ExecutionContext) =>
    Layer.succeed(this, { executionCtx });
}
