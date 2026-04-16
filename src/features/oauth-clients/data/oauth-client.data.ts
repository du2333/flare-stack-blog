import type {
  ClientInfo,
  GrantSummary,
} from "@cloudflare/workers-oauth-provider";
import { getOAuthHelpers } from "@/features/oauth-provider/oauth-provider.config";
import {
  OAuthClientInfoRowSchema,
  OAuthConnectionSchema,
} from "../schema/oauth-client.schema";

function normalizeClientInfo(client: ClientInfo) {
  return OAuthClientInfoRowSchema.parse({
    clientId: client.clientId,
    clientName: client.clientName ?? null,
    clientIcon: client.logoUri ?? null,
    clientType: null,
    public: client.tokenEndpointAuthMethod === "none",
    redirectUris: client.redirectUris,
  });
}

function mapGrantToConnection(
  grant: GrantSummary,
  client: ReturnType<typeof normalizeClientInfo> | null,
) {
  return OAuthConnectionSchema.parse({
    consentId: grant.id,
    clientId: grant.clientId,
    clientName: client?.clientName ?? null,
    clientIcon: client?.clientIcon ?? null,
    clientType: client?.clientType ?? null,
    createdAt: new Date(grant.createdAt * 1000).toISOString(),
    public: client?.public ?? false,
    redirectUris: client?.redirectUris ?? [],
    scopes: grant.scope,
  });
}

export async function listOAuthConnectionsByUserId(env: Env, userId: string) {
  const oauth = getOAuthHelpers(env);
  const { items } = await oauth.listUserGrants(userId, { limit: 1000 });

  const connections = await Promise.all(
    items.map(async (grant) => {
      const client = await oauth.lookupClient(grant.clientId);
      return mapGrantToConnection(
        grant,
        client ? normalizeClientInfo(client) : null,
      );
    }),
  );

  return connections.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findOAuthClientByClientId(env: Env, clientId: string) {
  const client = await getOAuthHelpers(env).lookupClient(clientId);

  if (!client) return null;

  return normalizeClientInfo(client);
}

export async function updateOAuthClientName(
  env: Env,
  clientId: string,
  clientName: string,
) {
  const client = await getOAuthHelpers(env).updateClient(clientId, {
    clientName,
  });

  if (!client) {
    return null;
  }

  return {
    clientId: client.clientId,
    clientName: client.clientName ?? null,
  };
}

export async function deleteOAuthConsentById(
  env: Env,
  consentId: string,
  userId: string,
) {
  await getOAuthHelpers(env).revokeGrant(consentId, userId);

  return { consentId };
}
