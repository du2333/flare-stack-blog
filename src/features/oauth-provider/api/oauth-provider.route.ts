import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Hono } from "hono";
import { getOAuthProtectedResourceMetadata } from "../service/oauth-provider.service";
import { baseMiddleware } from "@/lib/hono/middlewares";

const app = new Hono<{ Bindings: Env }>();

app.get("/.well-known/oauth-authorization-server", baseMiddleware, (c) => {
  const auth = c.get("auth");
  return oauthProviderAuthServerMetadata(auth)(c.req.raw);
});

app.get(
  "/.well-known/oauth-authorization-server/api/auth",
  baseMiddleware,
  (c) => {
    const auth = c.get("auth");
    return oauthProviderAuthServerMetadata(auth)(c.req.raw);
  },
);

app.get("/.well-known/openid-configuration", baseMiddleware, (c) => {
  const auth = c.get("auth");
  return oauthProviderOpenIdConfigMetadata(auth)(c.req.raw);
});

app.get("/.well-known/openid-configuration/api/auth", baseMiddleware, (c) => {
  const auth = c.get("auth");
  return oauthProviderOpenIdConfigMetadata(auth)(c.req.raw);
});

app.get("/.well-known/jwks.json", baseMiddleware, (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

app.get("/.well-known/oauth-protected-resource", baseMiddleware, async (c) => {
  const metadata = getOAuthProtectedResourceMetadata(c.env, c.req.url);
  return c.json(metadata);
});

export default app;
