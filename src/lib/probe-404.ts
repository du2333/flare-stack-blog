import { ROUTED_FIRST_SEGMENTS } from "virtual:routed-first-segments";
import { CACHE_CONTROL } from "@/lib/constants";

// First path segments the app routes come from the generated route tree
// (`scripts/vite-routed-segments.ts`), lowercased because the router is case
// insensitive. `_serverfn` is handled by TanStack Start itself, not by a file
// route.
export const FRAMEWORK_FIRST_SEGMENTS = ["_serverfn"] as const;

const KNOWN = new Set<string>([
  ...ROUTED_FIRST_SEGMENTS,
  ...FRAMEWORK_FIRST_SEGMENTS,
]);

/**
 * Whether the app can route this path. Scanners probe `/.env`, `/wp-admin/`
 * and the like, which would otherwise render the themed 404 inside the full
 * public layout. Static assets that exist are served before the Worker runs,
 * so `/assets/...` reaching here is a missing file and is unknown too.
 *
 * Leading slashes are skipped (`//x` is judged by `x`), so a doubled slash on a
 * real route still gets the router's normalizing redirect. The segment is
 * percent-decoded first, like the router does, and a malformed escape is
 * unknown. `/` and `//` are the index route.
 */
export function isRoutedPath(pathname: string): boolean {
  let start = 0;
  while (pathname.charCodeAt(start) === 47) start++;
  if (start >= pathname.length) return true;
  let end = pathname.indexOf("/", start);
  if (end === -1) end = pathname.length;
  let segment = pathname.slice(start, end);
  try {
    segment = decodeURIComponent(segment);
  } catch {
    return false;
  }
  return KNOWN.has(segment.toLowerCase());
}

// Self-contained: no stylesheet, script or font of the site, so answering a
// probe costs nothing more. It follows the visitor's colour scheme and no
// Theme; a person who mistyped an address still gets a page that looks whole.
const NOT_FOUND_STYLE = [
  ":root{--bg:#f4f5f7;--card:#fff;--fg:#16181d;--mute:#6b7280;--line:rgb(0 0 0/.1)}",
  "@media(prefers-color-scheme:dark){:root{--bg:#101114;--card:#17191d;--fg:#eceef2;--mute:#9aa1ad;--line:rgb(255 255 255/.12)}}",
  "*{box-sizing:border-box}",
  "body{display:grid;place-items:center;min-height:100vh;min-height:100dvh;margin:0;padding:24px;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}",
  "main{width:min(100%,420px);padding:44px 32px 36px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}",
  "b{display:block;color:var(--mute);font-size:56px;font-weight:700;line-height:1;letter-spacing:.02em}",
  "h1{margin:20px 0 6px;font-size:20px;line-height:1.4}",
  "p{margin:0;color:var(--mute);font-size:14px}",
  "a{display:inline-block;margin-top:24px;padding:9px 18px;border-radius:999px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:600;text-decoration:none}",
  "a:focus-visible{outline:2px solid var(--fg);outline-offset:3px}",
].join("");

const NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="light dark"><title>404 Not Found</title><style>${NOT_FOUND_STYLE}</style></head><body><main><b aria-hidden="true">404</b><h1>页面不存在</h1><p>404 · Page not found</p><a href="/">返回首页 · Home</a></main></body></html>`;

/** A bare 404 for paths the app has no route for; HEAD gets no body. */
export function probeNotFoundResponse(request: Request): Response {
  return new Response(request.method === "HEAD" ? null : NOT_FOUND_HTML, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...CACHE_CONTROL.private,
    },
  });
}
