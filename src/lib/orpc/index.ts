import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { reviveQueryDates } from "@/integrations/tanstack-query/revive-dates";
import { contract } from "./contract";
import type { AppRouter } from "./router";
import { createServerORPCClient } from "./server-client";

type AppORPCClient = ContractRouterClient<AppRouter>;

const getORPCClient = createIsomorphicFn()
  .server(() => createServerORPCClient())
  .client((): AppORPCClient => {
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
  });

export const orpcClient: AppORPCClient = getORPCClient();

export const orpc = createTanstackQueryUtils(orpcClient);
