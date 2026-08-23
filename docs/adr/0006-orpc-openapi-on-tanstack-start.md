# oRPC OpenAPI on a single TanStack Start Worker

JSON application APIs are an oRPC router served by `OpenAPIHandler` with explicit methods and paths, mounted at TanStack Start `/api/$`. Better Auth keeps `/api/auth/*`. Start owns the Worker `fetch` entry; Hono and `createServerFn` are removed. The browser calls real `/api/...` URLs; SSR calls the same router in-process. Non-JSON HTTP (images, feeds, Umami) stays on sibling Start routes; uploads are OpenAPI multipart procedures. Procedures live in `features/<name>/server/router.ts` with shared wiring in `src/lib/orpc`. Expected failures are oRPC typed errors, not HTTP 200 `Result` bodies. UI session stays on Better Auth. API keys, if added later, use these same URLs.

**Considered Options**

- oRPC native RPCHandler (procedure names, not resource URLs).
- Split web/API Workers with a service binding, as in the Better Auth monorepo template.
- Keep Hono for public JSON and only migrate admin server functions.
