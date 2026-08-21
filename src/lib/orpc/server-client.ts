import { createRouterClient } from "@orpc/server";
import { getGlobalStartContext } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createApiContext } from "./create-context";
import { router } from "./router";

export function createServerORPCClient() {
  return createRouterClient(router, {
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
  });
}
