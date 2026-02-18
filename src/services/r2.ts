import { Context, Effect, Layer } from "effect";
import { CloudflareEnvService } from "./cloudflare-env";

export class R2Service extends Context.Tag("./services/r2/R2Service")<
  R2Service,
  { r2: R2Bucket }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { env } = yield* CloudflareEnvService;
      return { r2: env.R2 };
    }),
  );
}
