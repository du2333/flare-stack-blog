import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { ResponseValidationPlugin } from "@orpc/contract/plugins";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  createIsomorphicFn,
  getGlobalStartContext,
} from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createApiContext } from "./create-context";
import { router } from "./router";

type AppORPCClient = ContractRouterClient<typeof router>;

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => {
        const context = getGlobalStartContext();
        if (!context) {
          throw new Error("No global start context found");
        }
        return createApiContext(
          getRequestHeaders(),
          context.env,
          context.executionCtx,
        );
      },
    }),
  )
  .client((): AppORPCClient => {
    const link = new OpenAPILink(router, {
      url: `${window.location.origin}/api`,
      plugins: [new ResponseValidationPlugin(router)],
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
