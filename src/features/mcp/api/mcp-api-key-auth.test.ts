import { describe, expect, it } from "vitest";
import { OAUTH_PROVIDER_SCOPES } from "@/features/oauth-provider/oauth-provider.shared";
import { MCP_API_KEY_HEADER } from "../constants";
import {
  createMcpApiKeyAuthProps,
  getMcpApiKeyAuthStatus,
} from "./mcp-api-key-auth";

function createRequest(apiKey?: string | null) {
  const headers = new Headers();

  if (apiKey != null) {
    headers.set(MCP_API_KEY_HEADER, apiKey);
  }

  return new Request("https://blog.example.com/mcp", { headers });
}

describe("getMcpApiKeyAuthStatus", () => {
  it("does not enable API key auth when MCP_API_KEY is missing", () => {
    expect(
      getMcpApiKeyAuthStatus(createRequest("secret"), {
        MCP_API_KEY: undefined,
      }),
    ).toBe("disabled");
  });

  it("reports missing when API key auth is configured but the header is absent", () => {
    expect(
      getMcpApiKeyAuthStatus(createRequest(), {
        MCP_API_KEY: "secret",
      }),
    ).toBe("missing");
  });

  it("accepts the configured API key", () => {
    expect(
      getMcpApiKeyAuthStatus(createRequest("secret"), {
        MCP_API_KEY: "secret",
      }),
    ).toBe("valid");
  });

  it("rejects a wrong API key", () => {
    expect(
      getMcpApiKeyAuthStatus(createRequest("wrong"), {
        MCP_API_KEY: "secret",
      }),
    ).toBe("invalid");
  });
});

describe("createMcpApiKeyAuthProps", () => {
  it("grants all supported OAuth scopes to API key requests", () => {
    expect(createMcpApiKeyAuthProps()).toEqual({
      authMethod: "api-key",
      clientId: "mcp-api-key",
      scopes: [...OAUTH_PROVIDER_SCOPES],
      subject: "mcp-api-key",
    });
  });
});
