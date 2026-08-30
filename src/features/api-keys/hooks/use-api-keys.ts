import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

const API_KEYS_QUERY_KEY = ["auth", "api-keys"] as const;

type ApiKeyListItem = {
  id: string;
  name?: string | null;
  start?: string | null;
  createdAt: Date | string;
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
      const { data, error } = await authClient.apiKey.list({
        query: { sortBy: "createdAt", sortDirection: "desc" },
      });
      if (error) throw error;
      return readListedKeys(data);
    },
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await authClient.apiKey.create({ name });
      if (error) throw error;
      if (!data?.key) {
        throw new Error("missing key");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
    onError: () => {
      toast.error(m.settings_api_keys_toast_create_fail());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await authClient.apiKey.delete({ keyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
      toast.success(m.settings_api_keys_toast_delete_success());
    },
    onError: () => {
      toast.error(m.settings_api_keys_toast_delete_fail());
    },
  });

  return {
    keys: listQuery.data ?? [],
    isLoading: listQuery.isPending && listQuery.data === undefined,
    createKey: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteKey: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
