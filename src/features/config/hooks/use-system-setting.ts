import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SystemConfig } from "@/features/config/config.schema";
import { systemConfigQuery } from "@/features/config/queries";
import { orpc, orpcClient } from "@/lib/orpc";

export function useSystemSetting() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(systemConfigQuery);

  const saveMutation = useMutation({
    mutationFn: (input: SystemConfig) => orpcClient.config.admin.update(input),
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
    settings: data,
    isLoading,
    saveSettings: saveMutation.mutateAsync,
  };
}
