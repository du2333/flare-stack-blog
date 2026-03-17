import { describe, expect, it } from "vitest";
import { flattenBlogScopes } from "./oauth-provider.scope";
import {
  createOAuthPrincipal,
  extractBearerToken,
  getOAuthProtectedResource,
  getOAuthProtectedResourceMetadataUrl,
  parseOAuthScopes,
} from "./oauth-provider.service";

describe("oauth-provider service", () => {
  it("extracts bearer tokens from authorization headers", () => {
    expect(extractBearerToken("Bearer token-123")).toBe("token-123");
    expect(extractBearerToken("opaque-token")).toBe("opaque-token");
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("filters unsupported scopes from scope claims", () => {
    expect(parseOAuthScopes("openid posts:read posts:unknown")).toEqual([
      "openid",
      "posts:read",
    ]);
    expect(parseOAuthScopes(null)).toEqual([]);
  });

  it("flattens structured scope requests", () => {
    expect(
      flattenBlogScopes({
        comments: ["write"],
        posts: ["read", "write"],
      }),
    ).toEqual(["comments:write", "posts:read", "posts:write"]);
  });

  it("derives the protected resource from request url", () => {
    expect(getOAuthProtectedResource("https://blog.example.com/mcp")).toBe(
      "https://blog.example.com/",
    );
    expect(getOAuthProtectedResource("https://blog.example.com/posts")).toBe(
      "https://blog.example.com/",
    );
  });

  it("builds the protected resource metadata url from the request url", () => {
    expect(
      getOAuthProtectedResourceMetadataUrl("https://blog.example.com/mcp"),
    ).toBe("https://blog.example.com/.well-known/oauth-protected-resource");
  });

  it("builds an oauth principal from jwt payload", () => {
    expect(
      createOAuthPrincipal({
        azp: "client_123",
        scope: "posts:read email",
        sub: "user_123",
      }),
    ).toMatchObject({
      clientId: "client_123",
      scopes: ["posts:read", "email"],
      subject: "user_123",
    });
  });
});
