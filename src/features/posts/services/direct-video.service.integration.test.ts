import type { MockInstance } from "vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as DirectVideoService from "./direct-video.service";

// The service parses pages with HTMLRewriter, which only exists in workerd.

const PAGE = "https://videos.example.com/w/clip";
const FILE = "https://videos.example.com/files/clip.mp4";

type Route = (init: RequestInit) => Response | Promise<Response>;

/** What each address answers; any other address is a network error. */
let routes: Record<string, Route>;
/** Every request but the DNS lookups, as address and headers. */
let requests: Array<{ url: string; headers: Headers; init: RequestInit }>;

/** DNS-over-HTTPS answers: every name is public unless listed here. */
const PRIVATE_NAMES = new Set(["intranet.example.com"]);

function dnsAnswer(url: URL) {
  const name = url.searchParams.get("name") ?? "";
  const type = url.searchParams.get("type");
  const Answer =
    type === "A"
      ? [
          {
            type: 1,
            data: PRIVATE_NAMES.has(name) ? "10.0.0.1" : "93.184.216.34",
          },
        ]
      : [];
  return Response.json({ Status: 0, Answer });
}

function html(body: string, headers: Record<string, string> = {}) {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

function video(status = 206) {
  return new Response("x", {
    status,
    headers: { "content-type": "video/mp4" },
  });
}

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { location } });
}

let warn: MockInstance<typeof console.warn>;

function warnings(): Array<Record<string, unknown>> {
  return warn.mock.calls.map((call) => JSON.parse(String(call[0])));
}

beforeEach(() => {
  routes = {};
  requests = [];
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.hostname === "cloudflare-dns.com") return dnsAnswer(url);
      requests.push({
        url: url.href,
        headers: new Headers(init.headers),
        init,
      });
      const route = routes[url.href];
      if (!route) throw new TypeError("Network connection lost.");
      return route(init);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const resolve = DirectVideoService.resolveDirectVideo;

it("returns a video file as the address given", async () => {
  routes[FILE] = () => video(200);
  expect(await resolve(`  ${FILE}  `)).toEqual({ kind: "file", src: FILE });
  const [request] = requests;
  expect(request.init.redirect).toBe("manual");
  expect(request.init.signal).toBeInstanceOf(AbortSignal);
  expect(request.headers.get("user-agent")).toBe("flare-stack-blog");
  expect(request.headers.get("cookie")).toBeNull();
  expect(request.headers.get("authorization")).toBeNull();
});

it("uses a page's og:video once a request for it answers a video file", async () => {
  routes[PAGE] = () =>
    html(`<!doctype html><html><head>
      <meta property="og:title" content="Tom &amp; Jerry">
      <meta property="og:image" content="https://videos.example.com/poster.jpg">
      <meta property="og:video" content="https://videos.example.com/other.mp4">
      <meta property="og:video:secure_url" content="${FILE}">
      <meta property="og:video:type" content="video/mp4">
      <title>Ignored</title>
    </head><body></body></html>`);
  routes[FILE] = () => video();

  expect(await resolve(PAGE)).toEqual({
    kind: "page",
    pageUrl: PAGE,
    src: FILE,
    title: "Tom & Jerry",
    cover: "https://videos.example.com/poster.jpg",
  });
  const check = requests.find((request) => request.url === FILE);
  expect(check?.headers.get("range")).toBe("bytes=0-0");
});

it("leaves src empty when the og:video does not answer a video file", async () => {
  routes[PAGE] = () =>
    html(
      `<head><meta property="og:video" content="${FILE}"><title>t</title></head>`,
    );
  routes[FILE] = () =>
    new Response("<html></html>", { headers: { "content-type": "text/html" } });

  expect(await resolve(PAGE)).toMatchObject({
    kind: "page",
    src: null,
    title: "t",
  });
  expect(warnings()).toContainEqual(
    expect.objectContaining({
      message: "direct video lookup failed",
      host: "videos.example.com",
      step: "video",
      contentType: "text/html",
    }),
  );
});

it("leaves src empty when the og:video cannot be reached", async () => {
  routes[PAGE] = () => html(`<meta property="og:video" content="${FILE}">`);
  routes[FILE] = () => new Response("gone", { status: 404 });
  expect(await resolve(PAGE)).toMatchObject({ kind: "page", src: null });
});

it("never asks for an og:video another site's player declares as text/html", async () => {
  const player = "https://www.youtube.com/embed/dQw4w9WgXcQ";
  routes[PAGE] = () =>
    html(`<head>
      <meta property="og:video:url" content="${player}">
      <meta property="og:video:type" content="text/html">
    </head>`);

  expect(await resolve(PAGE)).toMatchObject({ kind: "page", src: null });
  expect(requests.map((request) => request.url)).toEqual([PAGE]);
});

it("takes the title from <title> when the page has no og:title or og:video", async () => {
  routes[PAGE] = () =>
    html(`<html><head><title>
      A   clip &#8212; site
    </title></head><body><svg><title>icon</title></svg></body></html>`);

  expect(await resolve(PAGE)).toEqual({
    kind: "page",
    pageUrl: PAGE,
    src: null,
    title: "A clip — site",
    cover: null,
  });
});

it("cuts a long title to 200 characters", async () => {
  routes[PAGE] = () =>
    html(`<meta property="og:title" content="${"a".repeat(300)}">`);
  expect(await resolve(PAGE)).toMatchObject({ title: "a".repeat(200) });
});

it("reads relative addresses against the page and keeps only https ones", async () => {
  routes[PAGE] = () =>
    html(`<head>
      <meta property="og:image:secure_url" content="http://videos.example.com/insecure.jpg">
      <meta property="og:image" content="../poster.jpg?a=1&amp;b=2">
      <meta property="og:video" content="/files/clip.mp4">
    </head>`);
  routes[FILE] = () => video();

  expect(await resolve(PAGE)).toMatchObject({
    src: FILE,
    cover: "https://videos.example.com/poster.jpg?a=1&b=2",
  });
});

it("drops an og:image or og:video that is not https", async () => {
  routes[PAGE] = () =>
    html(`<head>
      <meta property="og:image" content="javascript:alert(1)">
      <meta property="og:video" content="http://videos.example.com/files/clip.mp4">
    </head>`);
  expect(await resolve(PAGE)).toMatchObject({ src: null, cover: null });
  expect(requests).toHaveLength(1);
});

it("does not read past the head", async () => {
  routes[PAGE] = () =>
    html(
      `<head><title>t</title></head><body>${"x".repeat(1024)}<meta property="og:title" content="late"></body>`,
    );
  expect(await resolve(PAGE)).toMatchObject({ title: "t" });
});

it("answers unsupported for an address that is not https, asking nothing", async () => {
  for (const address of [
    "http://videos.example.com/files/clip.mp4",
    "https://user:pass@videos.example.com/files/clip.mp4",
    "javascript:alert(1)",
    "not an address",
  ]) {
    expect(await resolve(address)).toEqual({ kind: "unsupported" });
  }
  expect(requests).toEqual([]);
});

it("follows a redirect to https and keeps the address given", async () => {
  const signed = "https://cdn.example.net/clip.mp4?signature=abc";
  routes[FILE] = () => redirect(signed);
  routes[signed] = () => video(200);
  expect(await resolve(FILE)).toEqual({ kind: "file", src: FILE });
});

it("refuses a redirect to http", async () => {
  routes[FILE] = () =>
    redirect("http://videos.example.com/files/clip.mp4", 301);
  expect(await resolve(FILE)).toEqual({ kind: "unreachable" });
  expect(requests).toHaveLength(1);
  expect(warnings()[0]).toMatchObject({
    step: "address",
    reason: "REDIRECT_REFUSED",
    location: "http://videos.example.com/files/clip.mp4",
  });
});

it("follows three redirects and refuses a fourth", async () => {
  const hop = (n: number) => `https://videos.example.com/hop/${n}`;
  for (let n = 0; n < 4; n++) routes[hop(n)] = () => redirect(hop(n + 1));
  routes[hop(3)] = () => video(200);
  expect(await resolve(hop(0))).toEqual({ kind: "file", src: hop(0) });

  routes[hop(3)] = () => redirect(hop(4));
  routes[hop(4)] = () => video(200);
  expect(await resolve(hop(0))).toEqual({ kind: "unreachable" });
  expect(warnings().at(-1)).toMatchObject({ reason: "TOO_MANY_REDIRECTS" });
});

it("does not ask an address that is not on the public internet", async () => {
  routes[FILE] = () => redirect("https://intranet.example.com/clip.mp4");
  expect(await resolve(FILE)).toEqual({ kind: "unreachable" });
  expect(requests.map((request) => request.url)).toEqual([FILE]);
  expect(warnings()[0]).toMatchObject({ reason: "NOT_PUBLIC" });
});

it("answers unreachable on a timeout", async () => {
  routes[FILE] = () => {
    throw new DOMException(
      "The operation was aborted due to timeout",
      "TimeoutError",
    );
  };
  expect(await resolve(FILE)).toEqual({ kind: "unreachable" });
  expect(warnings()[0]).toMatchObject({
    reason: "REQUEST_FAILED",
    error: "The operation was aborted due to timeout",
  });
});

it("answers unreachable on a network error", async () => {
  expect(await resolve(FILE)).toEqual({ kind: "unreachable" });
});

it("answers unreachable on a 404, and logs the status", async () => {
  routes[PAGE] = () => new Response("not found", { status: 404 });
  expect(await resolve(PAGE)).toEqual({ kind: "unreachable" });
  expect(warnings()[0]).toEqual({
    message: "direct video lookup failed",
    host: "videos.example.com",
    step: "address",
    status: 404,
  });
});

it("answers unsupported for something that is neither a video nor a page", async () => {
  routes[PAGE] = () => Response.json({ video: FILE });
  expect(await resolve(PAGE)).toEqual({ kind: "unsupported" });
  expect(warnings()[0]).toMatchObject({ contentType: "application/json" });
});
