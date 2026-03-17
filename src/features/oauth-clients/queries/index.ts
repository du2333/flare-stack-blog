import { queryOptions } from "@tanstack/react-query";
import { getOAuthConnectionsFn } from "../api/oauth-clients.admin.api";

export const OAUTH_CONNECTION_KEYS = {
  all: ["oauth-connections"] as const,
  list: ["oauth-connections", "list"] as const,
};

export const oauthConnectionsQuery = queryOptions({
  queryKey: OAUTH_CONNECTION_KEYS.list,
  queryFn: () => getOAuthConnectionsFn(),
});
