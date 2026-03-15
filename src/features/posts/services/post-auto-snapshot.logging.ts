import { isNotInProduction } from "@/lib/env/server.env";

export function logPostAutoSnapshot(
  env: Env,
  event: string,
  payload: Record<string, unknown>,
) {
  if (!isNotInProduction(env)) {
    return;
  }

  const now = new Date();
  console.log(
    JSON.stringify({
      message: "post auto snapshot",
      event,
      timestamp: now.toISOString(),
      timestampMs: now.getTime(),
      ...payload,
    }),
  );
}
