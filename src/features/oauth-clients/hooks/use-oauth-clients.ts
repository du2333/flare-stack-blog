import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import {
  deleteOAuthConnectionFn,
  renameOAuthClientFn,
} from "../api/oauth-clients.admin.api";
import { OAUTH_CONNECTION_KEYS, oauthConnectionsQuery } from "../queries";

export function useOAuthClients() {
  const queryClient = useQueryClient();
  const connectionsQuery = useQuery(oauthConnectionsQuery);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: OAUTH_CONNECTION_KEYS.list });

  const renameMutation = useMutation({
    mutationFn: renameOAuthClientFn,
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message.trim()
          ? error.message
          : m.settings_mcp_toast_rename_failed(),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOAuthConnectionFn,
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message.trim()
          ? error.message
          : m.settings_mcp_toast_disconnect_failed(),
      );
    },
  });

  return {
    connections: connectionsQuery.data ?? [],
    deleteConnection: deleteMutation.mutate,
    isLoading: connectionsQuery.isLoading,
    renameClient: renameMutation.mutate,
  };
}
