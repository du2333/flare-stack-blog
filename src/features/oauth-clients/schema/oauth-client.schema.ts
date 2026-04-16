import { z } from "zod";
import { OAUTH_PROVIDER_SCOPES } from "@/features/oauth-provider/oauth-provider.shared";

const OAUTH_SCOPE_SET = new Set<string>(OAUTH_PROVIDER_SCOPES);

export const OAuthClientTypeSchema = z.enum([
  "web",
  "native",
  "user-agent-based",
]);

export const OAuthScopeListSchema = z
  .array(z.string())
  .refine(
    (scopes) => scopes.every((scope) => OAUTH_SCOPE_SET.has(scope)),
    "Invalid scope",
  );

const PersistedOAuthScopeListSchema = z
  .array(z.string())
  .transform((scopes) => scopes.filter((scope) => OAUTH_SCOPE_SET.has(scope)));

export const OAuthConnectionSchema = z.object({
  consentId: z.string(),
  clientId: z.string(),
  clientName: z.string().nullable(),
  clientIcon: z.string().nullable(),
  clientType: OAuthClientTypeSchema.nullable(),
  createdAt: z.string(),
  public: z.boolean(),
  redirectUris: z.array(z.string()),
  scopes: PersistedOAuthScopeListSchema,
});

const JsonStringArraySchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(z.string()));

const IsoDateStringSchema = z
  .union([z.date(), z.string()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));

export const OAuthClientInfoRowSchema = z.object({
  clientId: z.string(),
  clientName: z.string().nullable(),
  clientIcon: z.string().nullable(),
  clientType: OAuthClientTypeSchema.nullable(),
  public: z.boolean(),
  redirectUris: JsonStringArraySchema,
});

export const OAuthConsentRowSchema = z.object({
  consentId: z.string(),
  clientId: z.string(),
  createdAt: IsoDateStringSchema,
  updatedAt: IsoDateStringSchema,
  scopes: PersistedOAuthScopeListSchema.or(
    JsonStringArraySchema.pipe(PersistedOAuthScopeListSchema),
  ),
});

export const RenameOAuthClientInputSchema = z.object({
  clientId: z.string(),
  clientName: z.string().trim().min(1).max(120),
});

export const DeleteOAuthConnectionInputSchema = z.object({
  consentId: z.string(),
});

export const GetOAuthClientMetadataInputSchema = z.object({
  clientId: z.string(),
});

export type OAuthConnectionRecord = z.infer<typeof OAuthConnectionSchema>;
export type OAuthClientInfoRow = z.infer<typeof OAuthClientInfoRowSchema>;
export type OAuthConsentRow = z.infer<typeof OAuthConsentRowSchema>;
export type RenameOAuthClientInput = z.infer<
  typeof RenameOAuthClientInputSchema
>;
export type GetOAuthClientMetadataInput = z.infer<
  typeof GetOAuthClientMetadataInputSchema
>;
