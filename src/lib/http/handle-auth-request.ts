import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { enforceIpRateLimit } from "./rate-limit";
import { enforceTurnstile } from "./turnstile";

const TURNSTILE_PROTECTED_PATHS = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
  "/api/auth/send-verification-email",
]);

export async function handleAuthRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  if (request.method === "POST") {
    if (TURNSTILE_PROTECTED_PATHS.has(pathname)) {
      const turnstileResponse = await enforceTurnstile(env, request);
      if (turnstileResponse) return turnstileResponse;

      const minuteLimit = await enforceIpRateLimit(env, request, {
        capacity: 5,
        interval: "1m",
        key: `auth:${pathname}:1m`,
      });
      if (minuteLimit) return minuteLimit;

      const hourlyLimit = await enforceIpRateLimit(env, request, {
        capacity: 10,
        interval: "1h",
        key: `auth:${pathname}:1h`,
      });
      if (hourlyLimit) return hourlyLimit;
    } else {
      const minuteLimit = await enforceIpRateLimit(env, request, {
        capacity: 5,
        interval: "1m",
        key: `auth:${pathname}:1m`,
      });
      if (minuteLimit) return minuteLimit;
    }
  }

  const db = getDb(env);
  const auth = getAuth({ db, env });
  return auth.handler(request);
}
