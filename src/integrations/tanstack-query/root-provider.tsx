import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { handleServerError } from "@/lib/errors";

export function getContext() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: handleServerError,
    }),
    mutationCache: new MutationCache({
      onError: handleServerError,
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  });
  return {
    queryClient,
  };
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
