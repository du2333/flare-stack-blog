import { Context, Effect, Layer } from "effect";
import { CloudflareEnvService } from "./cloudflare-env";
import { DatabaseService } from "./db";
import type { Auth } from "@/lib/auth/auth.server";
import { getAuth } from "@/lib/auth/auth.server";

export class AuthService extends Context.Tag("./services/auth/AuthService")<
  AuthService,
  { auth: Auth }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { db } = yield* DatabaseService;
      const { env } = yield* CloudflareEnvService;
      return { auth: getAuth({ db, env }) };
    }),
  ).pipe(Layer.provide(DatabaseService.Live));
}
