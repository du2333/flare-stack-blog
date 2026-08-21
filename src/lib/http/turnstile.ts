import { serverEnv } from "@/lib/env/server.env";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function enforceTurnstile(
  env: Env,
  request: Request,
): Promise<Response | null> {
  const secretKey = serverEnv(env).TURNSTILE_SECRET_KEY;
  if (!secretKey) return null;

  const token = request.headers.get("X-Turnstile-Token");
  if (!token) {
    return Response.json(
      {
        code: "TURNSTILE_MISSING_TOKEN",
        message: "Missing Turnstile token",
      },
      { status: 400 },
    );
  }

  const result = await verifyTurnstileToken({ secretKey, token });
  if (result.success) return null;

  return Response.json(
    {
      code: "TURNSTILE_VERIFICATION_FAILED",
      message: "Turnstile verification failed",
    },
    { status: 403 },
  );
}
