import * as OAuthClientRepo from "../data/oauth-client.data";
import type { RenameOAuthClientInput } from "../schema/oauth-client.schema";

export async function listOAuthConnections(context: AuthContext) {
  return OAuthClientRepo.listOAuthConnectionsByUserId(
    context.db,
    context.session.user.id,
  );
}

export async function renameOAuthClient(
  context: AuthContext,
  data: RenameOAuthClientInput,
) {
  const client = await OAuthClientRepo.updateOAuthClientName(
    context.db,
    data.clientId,
    data.clientName,
  );

  if (!client) {
    throw new Error("Client not found");
  }

  return {
    clientId: client.clientId,
    clientName: client.clientName ?? data.clientName,
  };
}

export async function deleteOAuthConnection(
  context: AuthContext,
  consentId: string,
) {
  const deletedConsent = await OAuthClientRepo.deleteOAuthConsentById(
    context.db,
    consentId,
    context.session.user.id,
  );

  if (!deletedConsent) {
    throw new Error("Connection not found");
  }

  return { success: true };
}
export async function getOAuthClientMetadata(
  context: DbContext,
  clientId: string,
) {
  return OAuthClientRepo.findOAuthClientByClientId(context.db, clientId);
}
