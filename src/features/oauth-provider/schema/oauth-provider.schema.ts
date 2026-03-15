import { z } from "zod";
import type { JWTPayload } from "jose";
import type { OAuthScope } from "../oauth-provider.config";
import { OAUTH_BLOG_SCOPE_GROUPS } from "../oauth-provider.config";

export const OAuthScopeRequestSchema = z.object({
  comments: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.comments)).optional(),
  media: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.media)).optional(),
  posts: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.posts)).optional(),
  settings: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.settings)).optional(),
});

export type OAuthScopeRequest = z.infer<typeof OAuthScopeRequestSchema>;

export interface OAuthPrincipal {
  clientId: string | null;
  scopes: OAuthScope[];
  subject: string | null;
  token: JWTPayload;
}
