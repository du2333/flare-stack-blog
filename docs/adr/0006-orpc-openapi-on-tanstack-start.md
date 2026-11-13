# oRPC OpenAPI on a single TanStack Start Worker

JSON application APIs are an oRPC router served by `OpenAPIHandler` with explicit methods and paths, mounted at TanStack Start `/api/$`. Better Auth keeps `/api/auth/*`. Start owns the Worker `fetch` entry; Hono and `createServerFn` are removed. The browser calls real `/api/...` URLs; SSR calls the same router in-process. Non-JSON HTTP (images, feeds, Umami) stays on sibling Start routes; uploads are OpenAPI multipart procedures. Procedures live in `features/<name>/server/router.ts` with shared wiring in `src/lib/orpc`. Expected failures are oRPC typed errors, not HTTP 200 `Result` bodies. UI session stays on Better Auth. API keys, if added later, use these same URLs.

Amended 2026-11-12: the session stays on Better Auth for its endpoints and actions (sign-in, sign-out, profile changes), but components and route guards no longer read it through Better Auth's client. They read it through one react-query query, `sessionQuery`, that fetches `/api/auth/get-session`, and the client is loaded only when an action runs. The client was part of the first load of every public page, and the query returns the same answer without it.

**Considered Options**

- oRPC native RPCHandler (procedure names, not resource URLs).
- Split web/API Workers with a service binding, as in the Better Auth monorepo template.
- Keep Hono for public JSON and only migrate admin server functions.
