import { type AnyContractRouter, isContractProcedure } from "@orpc/contract";

/**
 * The part of the oRPC contract the browser needs: the HTTP method and path
 * of every procedure.
 *
 * `OpenAPILink` (`@orpc/openapi-client`) reads, per procedure, `route.path` and
 * `route.method` to build the request, `route.inputStructure` and
 * `route.outputStructure` (absent here: both default to `compact`), and checks
 * with `isContractProcedure` that `errorMap`, `route` and `meta` exist. The
 * summary, description and tags document the OpenAPI document, which the
 * server builds from its own router, so they stay out of the browser's bundle.
 */
export function browserContractRouter(router: AnyContractRouter): unknown {
  if (isContractProcedure(router)) {
    const { method, path } = router["~orpc"].route;
    return { "~orpc": { errorMap: {}, meta: {}, route: { method, path } } };
  }
  if (typeof router !== "object" || router === null) return router;
  return Object.fromEntries(
    Object.entries(router).map(([key, child]) => [
      key,
      browserContractRouter(child as AnyContractRouter),
    ]),
  );
}
