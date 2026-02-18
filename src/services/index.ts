import { Layer, ManagedRuntime } from "effect";
import {
  CloudflareEnvService,
  CloudflareExecutionContextService,
} from "./cloudflare-env";
import { D1Service } from "./d1";
import { DatabaseService } from "./db";
import { KVService } from "./kv";
import { R2Service } from "./r2";
import type { AuthService } from "./auth";

// Re-export services
export { AuthService } from "./auth";
export {
  CloudflareEnvService,
  CloudflareExecutionContextService,
} from "./cloudflare-env";
export { D1Service } from "./d1";
export { DatabaseService } from "./db";
export { KVService } from "./kv";
export { R2Service } from "./r2";

// Re-export Effect runtime types and functions
export type {
  RunApiEffectWithRuntime,
  ApiResult,
  SerializableError,
} from "@/lib/effect/result";
export {
  createRunEffect,
  runApiEffectWithRuntime,
  toApiResult,
} from "@/lib/effect/result";

export function createAppRuntime(env: Env, executionCtx: ExecutionContext) {
  // 逐层构建，使用 Layer.provideMerge 确保依赖传递
  const L1 = Layer.mergeAll(
    CloudflareEnvService.Live(env),
    CloudflareExecutionContextService.Live(executionCtx),
  );

  const L2 = Layer.mergeAll(
    D1Service.Live,
    KVService.Live,
    R2Service.Live,
  ).pipe(Layer.provideMerge(L1));

  const L3 = DatabaseService.Live.pipe(Layer.provideMerge(L2));

  return ManagedRuntime.make(L3);
}

export type AppRuntime = ReturnType<typeof createAppRuntime>;

// 所有可用的服务类型
export type AppServices =
  // 基础服务
  | CloudflareEnvService
  | CloudflareExecutionContextService
  | D1Service
  | KVService
  | R2Service
  | DatabaseService
  // 业务服务 (Effect 版本作为示例，可选集成)
  | AuthService;
