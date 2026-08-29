import { useMutation } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc";

export function useWebhookConnection() {
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof orpcClient.webhooks.test>[0]) =>
      orpcClient.webhooks.test(input),
  });

  return {
    testWebhook: mutation.mutateAsync,
    isTesting: mutation.isPending,
  };
}
