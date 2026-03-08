import { useMutation } from "@tanstack/react-query";
import { testWebhookFn } from "@/features/webhook/api/webhook.api";

export function useWebhookConnection() {
  const mutation = useMutation({
    mutationFn: testWebhookFn,
  });

  return {
    testWebhook: mutation.mutateAsync,
    testingEndpointId: mutation.variables?.data.endpoint.id,
    isTesting: mutation.isPending,
  };
}
