import { serverEnv } from "@/lib/env/server.env";

export function logPostAutoSnapshot(
  env: Env,
  event: string,
  payload: Record<string, unknown>,
) {
  if (serverEnv(env).ENVIRONMENT !== "dev") {
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
