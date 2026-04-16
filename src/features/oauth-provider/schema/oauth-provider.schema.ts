import { z } from "zod";
import type { OAuthScope } from "../oauth-provider.shared";
import { OAUTH_BLOG_SCOPE_GROUPS } from "../oauth-provider.shared";

export const OAuthScopeRequestSchema = z.object({
  analytics: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.analytics)).optional(),
  comments: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.comments)).optional(),
  "friend-links": z
    .array(z.enum(OAUTH_BLOG_SCOPE_GROUPS["friend-links"]))
    .optional(),
  media: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.media)).optional(),
  posts: z.array(z.enum(OAUTH_BLOG_SCOPE_GROUPS.posts)).optional(),
});

export type OAuthScopeRequest = z.infer<typeof OAuthScopeRequestSchema>;

export interface OAuthPrincipal {
  clientId: string | null;
  scopes: OAuthScope[];
  subject: string | null;
}
