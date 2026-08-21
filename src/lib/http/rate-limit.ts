import type { Duration } from "@/lib/duration";

export async function enforceIpRateLimit(
  env: Env,
  request: Request,
  options: { capacity: number; interval: Duration; key: string },
): Promise<Response | null> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const uniqueIdentifier = `${ip}:${options.key}`;
  const id = env.RATE_LIMITER.idFromName(uniqueIdentifier);
  const rateLimiter = env.RATE_LIMITER.get(id);
  const result = await rateLimiter.checkLimit({
    capacity: options.capacity,
    interval: options.interval,
  });

  if (result.allowed) return null;

  return Response.json(
    {
      code: "RATE_LIMITED",
      message: "Too Many Requests",
      retryAfterMs: result.retryAfterMs,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
        ),
      },
    },
  );
}
