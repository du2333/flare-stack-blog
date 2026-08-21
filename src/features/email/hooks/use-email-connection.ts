import { useMutation } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc";

export function useEmailConnection() {
  const mutation = useMutation({
    mutationFn: (input: {
      host: string;
      port: number;
      username: string;
      password: string;
      senderAddress: string;
      senderName?: string;
    }) => orpcClient.email.testConnection(input),
  });

  return {
    testEmailConnection: mutation.mutateAsync,
  };
}
