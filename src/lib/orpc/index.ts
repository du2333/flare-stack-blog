import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { reviveQueryDates } from "@/integrations/tanstack-query/revive-dates";
import { contract } from "./contract";
import type { AppRouter } from "./router";

type AppORPCClient = ContractRouterClient<AppRouter>;

function createBrowserORPCClient(): AppORPCClient {
  const link = new OpenAPILink(contract, {
    url: `${window.location.origin}/api`,
    interceptors: [async (options) => reviveQueryDates(await options.next())],
    headers: async () => {
      const { getTurnstileToken } =
        await import("@/components/common/turnstile");
      const token = getTurnstileToken();
      return token ? { "X-Turnstile-Token": token } : {};
    },
  });

  return createORPCClient(link);
}

export const orpcClient: AppORPCClient = import.meta.env.SSR
  ? (await import("./server-client")).createServerORPCClient()
  : createBrowserORPCClient();

export const orpc = createTanstackQueryUtils(orpcClient);
