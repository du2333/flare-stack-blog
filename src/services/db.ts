import { Context, Effect, Layer } from "effect";
import { CloudflareEnvService } from "./cloudflare-env";
import type { DB } from "@/lib/db";
import { getDb } from "@/lib/db";

export class DatabaseService extends Context.Tag(
  "./services/db/DatabaseService",
)<DatabaseService, { db: DB }>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { env } = yield* CloudflareEnvService;
      return { db: getDb(env) };
    }),
  );
}
