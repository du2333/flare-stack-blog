import { Effect } from "effect";
import type { AppRuntime } from "@/services";

/**
 * 可序列化的错误类型
 *
 * 只保留 _tag 和 message，用于前端穷尽匹配和错误展示
 */
export type SerializableError<TError> = TError extends {
  readonly _tag: infer Tag;
}
  ? { readonly _tag: Tag; readonly message: string }
  : { readonly message: string };

function toSerializableError<TError>(error: TError): SerializableError<TError> {
  if (error !== null && typeof error === "object" && "_tag" in error) {
    return {
      _tag: (error as { _tag: unknown })._tag,
      message:
        "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown error",
    } as SerializableError<TError>;
  }
  return {
    message: error instanceof Error ? error.message : String(error),
  } as SerializableError<TError>;
}

export type ApiResult<TData, TError> =
  | { ok: true; data: TData }
  | { ok: false; error: SerializableError<TError> };

export function toApiResult<TValue, TError, TRequirements>(
  effect: Effect.Effect<TValue, TError, TRequirements>,
): Effect.Effect<ApiResult<TValue, TError>, never, TRequirements> {
  return Effect.match(effect, {
    onSuccess: (data) => ({ ok: true as const, data }),
    onFailure: (error) => ({
      ok: false as const,
      error: toSerializableError(error),
    }),
  });
}

export function runApiEffectWithRuntime<TValue, TError>(
  runtime: AppRuntime,
  effect: Effect.Effect<TValue, TError, never>,
): Promise<ApiResult<TValue, TError>> {
  return runtime.runPromise(toApiResult(effect));
}

export type RunApiEffectWithRuntime = <TValue, TError>(
  effect: Effect.Effect<TValue, TError, never>,
) => Promise<ApiResult<TValue, TError>>;

export const createRunEffect =
  (runtime: AppRuntime): RunApiEffectWithRuntime =>
  (effect) =>
    runApiEffectWithRuntime(runtime, effect);
