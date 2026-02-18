import { Context, Effect, Layer } from "effect";
import { CloudflareEnvService } from "./cloudflare-env";

export class D1Service extends Context.Tag("./services/d1/D1Service")<
  D1Service,
  { d1: D1Database }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { env } = yield* CloudflareEnvService;
      return { d1: env.DB };
    }),
  );
}
