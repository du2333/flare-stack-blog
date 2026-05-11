import { OAUTH_PROVIDER_SCOPES } from "@/features/oauth-provider/oauth-provider.shared";
import { MCP_API_KEY_HEADER } from "../constants";

export type McpApiKeyAuthStatus = "disabled" | "missing" | "valid" | "invalid";

const MCP_API_KEY_CLIENT_ID = "mcp-api-key";
const textEncoder = new TextEncoder();

function normalizeApiKey(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function getMcpApiKeyAuthStatus(
  request: Request,
  env: Pick<Env, "MCP_API_KEY">,
): McpApiKeyAuthStatus {
  const configuredApiKey = normalizeApiKey(env.MCP_API_KEY);

  if (!configuredApiKey) {
    return "disabled";
  }

  const requestApiKey = normalizeApiKey(
    request.headers.get(MCP_API_KEY_HEADER),
  );

  if (!requestApiKey) {
    return "missing";
  }

  return timingSafeEqual(requestApiKey, configuredApiKey) ? "valid" : "invalid";
}

export function createMcpApiKeyAuthProps(): Record<string, unknown> {
  return {
    authMethod: "api-key",
    clientId: MCP_API_KEY_CLIENT_ID,
    scopes: [...OAUTH_PROVIDER_SCOPES],
    subject: MCP_API_KEY_CLIENT_ID,
  };
}

export function createInvalidMcpApiKeyResponse() {
  return new Response(
    JSON.stringify({
      code: "INVALID_MCP_API_KEY",
      message: "Invalid MCP API key",
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      status: 401,
    },
  );
}
