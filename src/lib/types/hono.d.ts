import "hono";

declare module "hono" {
  interface ExecutionContext {
    readonly exports: Cloudflare.Exports;
  }
}
