import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { systemConfigQuery } from "@/features/config/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import type { UpdateConfigSection } from "../config.admin.schema";

export function useSystemSetting() {
  const queryClient = useQueryClient();
  const query = useQuery({ ...systemConfigQuery, refetchOnMount: "always" });
  const mutation = useMutation({
    mutationFn: (input: UpdateConfigSection) =>
      orpcClient.config.admin.update(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.config.admin.get.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.config.siteConfig.key(),
        }),
      ]);
    },
  });
  return {
    snapshot: query.data,
    saveSettings: mutation.mutateAsync,
    isLoading: query.isPending,
    reload: query.refetch,
  };
}
