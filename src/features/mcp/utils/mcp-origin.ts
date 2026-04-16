function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

function appendVary(headers: Headers, value: string) {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }

  const values = existing
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.includes(value)) {
    values.push(value);
    headers.set("Vary", values.join(", "));
  }
}

export function isAllowedMcpOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === getRequestOrigin(request);
}

export function applyMcpOriginPolicy(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");

  headers.delete("Access-Control-Allow-Origin");

  if (origin && origin === getRequestOrigin(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
    appendVary(headers, "Origin");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function createInvalidOriginResponse() {
  return new Response(
    JSON.stringify({
      code: "INVALID_ORIGIN",
      message: "Invalid Origin header",
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      status: 403,
    },
  );
}
