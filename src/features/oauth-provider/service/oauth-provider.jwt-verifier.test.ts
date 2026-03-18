import { APIError } from "better-call";
import { exportJWK, generateKeyPair, type JSONWebKeySet, SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLocalOAuthJwksCache,
  LOCAL_OAUTH_JWKS_CACHE_TTL_MS,
  readJwtVerificationMetadata,
  verifyLocalOAuthJwtAccessToken,
} from "./oauth-provider.jwt-verifier";

const ISSUER = "https://blog.example.com/api/auth";
const AUDIENCE = "https://blog.example.com/";
const REQUEST_URL = "https://blog.example.com/mcp";

async function createSignedToken({
  azp = "client_123",
  expiresIn = "1h",
  kid,
  scope = "posts:read",
}: {
  azp?: string;
  expiresIn?: string;
  kid: string;
  scope?: string;
}) {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const publicJwk = await exportJWK(publicKey);

  return {
    jwks: {
      keys: [
        {
          ...publicJwk,
          alg: "EdDSA",
          kid,
        },
      ],
    } satisfies JSONWebKeySet,
    token: await new SignJWT({ azp, scope })
      .setProtectedHeader({ alg: "EdDSA", kid })
      .setAudience(AUDIENCE)
      .setExpirationTime(expiresIn)
      .setIssuedAt()
      .setIssuer(ISSUER)
      .sign(privateKey),
  };
}

afterEach(() => {
  clearLocalOAuthJwksCache();
});

describe("oauth-provider jwt verifier", () => {
  it("reuses cached jwks for the same kid within ttl", async () => {
    const { jwks, token } = await createSignedToken({ kid: "kid-1" });
    let fetchCount = 0;
    const fetchJwks = async () => {
      fetchCount += 1;
      return jwks;
    };

    await verifyLocalOAuthJwtAccessToken({
      accessToken: token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    await verifyLocalOAuthJwtAccessToken({
      accessToken: token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    expect(fetchCount).toBe(1);
  });

  it("refreshes jwks cache after ttl expires", async () => {
    const { jwks, token } = await createSignedToken({ kid: "kid-2" });
    let currentTime = 1_000;
    let fetchCount = 0;
    const fetchJwks = async () => {
      fetchCount += 1;
      return jwks;
    };

    await verifyLocalOAuthJwtAccessToken({
      accessToken: token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      now: () => currentTime,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    currentTime += LOCAL_OAUTH_JWKS_CACHE_TTL_MS + 1;

    await verifyLocalOAuthJwtAccessToken({
      accessToken: token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      now: () => currentTime,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    expect(fetchCount).toBe(2);
  });

  it("refreshes jwks cache when kid changes", async () => {
    const first = await createSignedToken({ kid: "kid-a" });
    const second = await createSignedToken({ kid: "kid-b" });
    let fetchCount = 0;

    const fetchJwks = async () => {
      fetchCount += 1;
      return fetchCount === 1 ? first.jwks : second.jwks;
    };

    await verifyLocalOAuthJwtAccessToken({
      accessToken: first.token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    await verifyLocalOAuthJwtAccessToken({
      accessToken: second.token,
      audience: AUDIENCE,
      fetchJwks,
      issuer: ISSUER,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    expect(fetchCount).toBe(2);
  });

  it("rejects tokens that do not satisfy required scopes", async () => {
    const { jwks, token } = await createSignedToken({ kid: "kid-scope" });

    await expect(
      verifyLocalOAuthJwtAccessToken({
        accessToken: token,
        audience: AUDIENCE,
        fetchJwks: async () => jwks,
        issuer: ISSUER,
        requestUrl: REQUEST_URL,
        requiredScopes: ["posts:write"],
      }),
    ).rejects.toBeInstanceOf(APIError);

    await expect(
      verifyLocalOAuthJwtAccessToken({
        accessToken: token,
        audience: AUDIENCE,
        fetchJwks: async () => jwks,
        issuer: ISSUER,
        requestUrl: REQUEST_URL,
        requiredScopes: ["posts:write"],
      }),
    ).rejects.toMatchObject({
      status: "FORBIDDEN",
      statusCode: 403,
    });
  });

  it("copies azp into client_id on successful verification", async () => {
    const { jwks, token } = await createSignedToken({
      azp: "client_456",
      kid: "kid-client-id",
    });

    const payload = await verifyLocalOAuthJwtAccessToken({
      accessToken: token,
      audience: AUDIENCE,
      fetchJwks: async () => jwks,
      issuer: ISSUER,
      requestUrl: REQUEST_URL,
      requiredScopes: ["posts:read"],
    });

    expect(payload.client_id).toBe("client_456");
  });

  it("maps malformed jwt headers to the standard unauthorized error", async () => {
    await expect(
      verifyLocalOAuthJwtAccessToken({
        accessToken: "not-a-jwt",
        audience: AUDIENCE,
        fetchJwks: async () => {
          throw new Error("fetchJwks should not be called");
        },
        issuer: ISSUER,
        requestUrl: REQUEST_URL,
        requiredScopes: ["posts:read"],
      }),
    ).rejects.toMatchObject({
      status: "UNAUTHORIZED",
      statusCode: 401,
    });
  });

  it("extracts jwt metadata for diagnostics", async () => {
    const { token } = await createSignedToken({ kid: "kid-meta" });

    expect(readJwtVerificationMetadata(token)).toMatchObject({
      alg: "EdDSA",
      kid: "kid-meta",
      tokenSegmentCount: 3,
    });
  });
});
