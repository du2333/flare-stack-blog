import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getAuthClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

export const API_KEYS_QUERY_KEY = ["auth", "api-keys"] as const;

export type ApiKeyListItem = {
  id: string;
  name?: string | null;
  start?: string | null;
  createdAt: Date | string;
  lastRequest?: Date | string | null;
  metadata?: unknown;
};

function readListedKeys(data: unknown): ApiKeyListItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as ApiKeyListItem[];
  if (
    typeof data === "object" &&
    data &&
    "apiKeys" in data &&
    Array.isArray((data as { apiKeys: unknown }).apiKeys)
  ) {
    return (data as { apiKeys: ApiKeyListItem[] }).apiKeys;
  }
  return [];
}

export function useApiKeys() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getAuthClient().apiKey.list({
        query: { sortBy: "createdAt", sortDirection: "desc" },
      });
      if (error) throw error;
      return readListedKeys(data);
    },
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await getAuthClient().apiKey.create({ name });
      if (error) throw error;
      if (!data?.key) {
        throw new Error("missing key");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
    onError: () => {
      toast.error(m.settings_api_keys_toast_create_fail());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ keyId }: { keyId: string; quiet?: boolean }) => {
      const { error } = await getAuthClient().apiKey.delete({ keyId });
      if (error) throw error;
    },
    onSuccess: async (_data, { quiet }) => {
      await queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
      if (!quiet) toast.success(m.settings_api_keys_toast_delete_success());
    },
    onError: () => {
      toast.error(m.settings_api_keys_toast_delete_fail());
    },
  });

  return {
    keys: listQuery.data ?? [],
    isLoading: listQuery.isPending && listQuery.data === undefined,
    isError: listQuery.isError,
    reload: listQuery.refetch,
    createKey: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    /** `quiet` leaves the success toast to a caller that shows its own. */
    deleteKey: (keyId: string, options: { quiet?: boolean } = {}) =>
      deleteMutation.mutateAsync({ keyId, ...options }),
    isDeleting: deleteMutation.isPending,
  };
}
