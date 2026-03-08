import { createServerFn } from "@tanstack/react-start";
import { serverEnv } from "@/lib/env/server.env";

export const getSiteDomainFn = createServerFn().handler(({ context }) => {
  return serverEnv(context.env).DOMAIN;
});
