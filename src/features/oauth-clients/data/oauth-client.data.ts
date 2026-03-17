import { and, desc, eq, inArray } from "drizzle-orm";
import { oauthClient, oauthConsent } from "@/lib/db/schema/auth.table";
import {
  OAuthClientInfoRowSchema,
  OAuthConnectionSchema,
  OAuthConsentRowSchema,
} from "../schema/oauth-client.schema";

export async function listOAuthConnectionsByUserId(db: DB, userId: string) {
  const consents = await db.query.oauthConsent.findMany({
    where: eq(oauthConsent.userId, userId),
    orderBy: [desc(oauthConsent.updatedAt)],
  });
  const clientIds = [...new Set(consents.map((consent) => consent.clientId))];
  if (clientIds.length === 0) {
    return [];
  }

  const clients = await db.query.oauthClient.findMany({
    where: inArray(oauthClient.clientId, clientIds),
  });

  const clientsById = new Map(
    clients.map((client) => {
      const normalizedClient = OAuthClientInfoRowSchema.parse({
        clientId: client.clientId,
        clientName: client.name,
        clientIcon: client.icon,
        clientType: client.type,
        public: client.public ?? false,
        redirectUris: client.redirectUris,
      });

      return [normalizedClient.clientId, normalizedClient] as const;
    }),
  );

  return consents.map((consent) => {
    const normalizedConsent = OAuthConsentRowSchema.parse({
      consentId: consent.id,
      clientId: consent.clientId,
      createdAt: consent.createdAt ?? new Date(0),
      updatedAt: consent.updatedAt ?? new Date(0),
      scopes: consent.scopes,
    });
    const client = clientsById.get(normalizedConsent.clientId);

    return OAuthConnectionSchema.parse({
      ...normalizedConsent,
      clientName: client?.clientName ?? null,
      clientIcon: client?.clientIcon ?? null,
      clientType: client?.clientType ?? null,
      public: client?.public ?? false,
      redirectUris: client?.redirectUris ?? [],
    });
  });
}

export async function findOAuthClientByClientId(db: DB, clientId: string) {
  const client = await db.query.oauthClient.findFirst({
    where: eq(oauthClient.clientId, clientId),
  });

  if (!client) return null;

  return OAuthClientInfoRowSchema.parse({
    clientId: client.clientId,
    clientName: client.name,
    clientIcon: client.icon,
    clientType: client.type,
    public: client.public ?? false,
    redirectUris: client.redirectUris,
  });
}

export async function updateOAuthClientName(
  db: DB,
  clientId: string,
  clientName: string,
) {
  const [client] = await db
    .update(oauthClient)
    .set({
      name: clientName,
      updatedAt: new Date(),
    })
    .where(eq(oauthClient.clientId, clientId))
    .returning({
      clientId: oauthClient.clientId,
      clientName: oauthClient.name,
    });

  return client ?? null;
}

export async function deleteOAuthConsentById(
  db: DB,
  consentId: string,
  userId: string,
) {
  const [deletedConsent] = await db
    .delete(oauthConsent)
    .where(and(eq(oauthConsent.id, consentId), eq(oauthConsent.userId, userId)))
    .returning({
      consentId: oauthConsent.id,
    });

  return deletedConsent ?? null;
}
