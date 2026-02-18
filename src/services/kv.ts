import { Context, Effect, Layer } from "effect";
import { CloudflareEnvService } from "./cloudflare-env";

export class KVService extends Context.Tag("./services/kv/KVService")<
  KVService,
  { kv: KVNamespace }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { env } = yield* CloudflareEnvService;
      return { kv: env.KV };
    }),
  );
}
