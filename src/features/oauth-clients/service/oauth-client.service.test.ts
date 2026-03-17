import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteOAuthConnection,
  listOAuthConnections,
  renameOAuthClient,
} from "./oauth-client.service";

const oauthClientData = vi.hoisted(() => ({
  deleteOAuthConsentById: vi.fn(),
  listOAuthConnectionsByUserId: vi.fn(),
  updateOAuthClientName: vi.fn(),
}));

vi.mock("../data/oauth-client.data", () => oauthClientData);

describe("oauth-client service", () => {
  const context = {
    db: {},
    session: {
      user: {
        id: "user_123",
      },
    },
  } as AuthContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists oauth connections via data layer", async () => {
    oauthClientData.listOAuthConnectionsByUserId.mockResolvedValue([
      {
        consentId: "consent_123",
        clientId: "client_123",
        clientName: "Codex",
        clientType: "web",
        createdAt: "2026-03-15T10:00:00.000Z",
        updatedAt: "2026-03-15T12:00:00.000Z",
        public: false,
        redirectUris: ["http://localhost:6274/oauth/callback/debug"],
        scopes: ["posts:read", "posts:write"],
      },
    ]);

    const connections = await listOAuthConnections(context);

    expect(oauthClientData.listOAuthConnectionsByUserId).toHaveBeenCalledWith(
      context.db,
      "user_123",
    );
    expect(connections).toEqual([
      {
        consentId: "consent_123",
        clientId: "client_123",
        clientName: "Codex",
        clientType: "web",
        createdAt: "2026-03-15T10:00:00.000Z",
        updatedAt: "2026-03-15T12:00:00.000Z",
        public: false,
        redirectUris: ["http://localhost:6274/oauth/callback/debug"],
        scopes: ["posts:read", "posts:write"],
      },
    ]);
  });

  it("renames client via data layer", async () => {
    oauthClientData.updateOAuthClientName.mockResolvedValue({
      clientId: "client_123",
      clientName: "Codex Updated",
    });

    const result = await renameOAuthClient(context, {
      clientId: "client_123",
      clientName: "Codex Updated",
    });

    expect(oauthClientData.updateOAuthClientName).toHaveBeenCalledWith(
      context.db,
      "client_123",
      "Codex Updated",
    );
    expect(result).toEqual({
      clientId: "client_123",
      clientName: "Codex Updated",
    });
  });

  it("deletes only the current user's consent via data layer", async () => {
    oauthClientData.deleteOAuthConsentById.mockResolvedValue({
      consentId: "consent_123",
    });

    await deleteOAuthConnection(context, "consent_123");

    expect(oauthClientData.deleteOAuthConsentById).toHaveBeenCalledWith(
      context.db,
      "consent_123",
      "user_123",
    );
  });
});
