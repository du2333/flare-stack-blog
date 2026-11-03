import type { DirectVideoLookup } from "@/features/posts/utils/video-source";
import { directVideoAddress } from "@/features/posts/utils/video-source";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";
import { checkPublicUrl } from "@/lib/http/public-fetch";

/*
 * Looks up an address the Admin gave for a Direct Video, once, when the
 * editor embeds it. The address is someone else's server, so the request
 * carries no account details, follows few redirects and only to HTTPS, and
 * like a Media import from a URL reaches only the public internet. A page is
 * read up to the end of its head, and a video it names is used only once a
 * request for it answers a video file: an og:video is often another site's
 * player (YouTube, Vimeo, PeerTube), which cannot become a Direct Video.
 */

const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
/** Pages put their meta tags in the head, well inside this. */
const MAX_PAGE_BYTES = 512 * 1024;
const USER_AGENT = "flare-stack-blog";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const VIDEO_KEYS = ["og:video:secure_url", "og:video:url", "og:video"];
const COVER_KEYS = ["og:image:secure_url", "og:image:url", "og:image"];

type FetchFailure =
  /** The address, or one it redirects to, is not on the public internet. */
  | { reason: "NOT_PUBLIC"; url: string }
  /** A redirect to an address that is not HTTPS, or to none. */
  | { reason: "REDIRECT_REFUSED"; location: string | null }
  | { reason: "TOO_MANY_REDIRECTS" }
  | { reason: "REQUEST_FAILED"; error: string };

function warnLookupFailed(url: URL, detail: Record<string, unknown>) {
  console.warn(
    JSON.stringify({
      message: "direct video lookup failed",
      host: url.hostname,
      ...detail,
    }),
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * GETs `url`, following up to three redirects by hand so that each one is
 * checked: HTTPS, and on the public internet. The final response is returned
 * whatever its status, with the address it came from.
 */
async function get(
  url: URL,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Result<{ response: Response; url: URL }, FetchFailure>> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const refused = await checkPublicUrl(current, signal);
    if (refused?.reason === "UNREACHABLE") {
      return err({ reason: "REQUEST_FAILED", error: "DNS lookup failed" });
    }
    if (refused) return err({ reason: "NOT_PUBLIC", url: current.href });

    let response: Response;
    try {
      response = await fetch(current, {
        headers: { "user-agent": USER_AGENT, ...headers },
        redirect: "manual",
        signal,
      });
    } catch (error) {
      return err({ reason: "REQUEST_FAILED", error: errorMessage(error) });
    }
    if (!REDIRECT_STATUSES.has(response.status)) {
      return ok({ response, url: current });
    }

    await response.body?.cancel();
    const location = response.headers.get("location");
    let next: string | null = null;
    try {
      next = location
        ? directVideoAddress(new URL(location, current).href)
        : null;
    } catch {
      next = null;
    }
    if (!next) return err({ reason: "REDIRECT_REFUSED", location });
    current = new URL(next);
  }
  return err({ reason: "TOO_MANY_REDIRECTS" });
}

/** The response's media type, such as `video/mp4`, lower-cased. */
function mediaType(response: Response) {
  return (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

const NAMED_CHARACTERS: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * `value` with its character references read. HTMLRewriter hands attribute
 * values and text as written in the page, so `&amp;` in an address or a
 * title is still `&amp;`.
 */
function decodeHtml(value: string) {
  return value.replace(
    /&(?:#(\d{1,7})|#x([\da-f]{1,6})|([a-z]+));/gi,
    (reference, decimal?: string, hex?: string, name?: string) => {
      if (name) return NAMED_CHARACTERS[name.toLowerCase()] ?? reference;
      const code = decimal
        ? Number.parseInt(decimal, 10)
        : Number.parseInt(hex ?? "", 16);
      return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)
        ? String.fromCodePoint(code)
        : reference;
    },
  );
}

/**
 * `body` up to `limit` bytes, ending early once `done()` says the reader has
 * what it needs; the rest of `body` is cancelled, never downloaded.
 */
function readUpTo(
  body: ReadableStream<Uint8Array>,
  limit: number,
  done: () => boolean,
) {
  const reader = body.getReader();
  let read = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done() || read >= limit) {
        await reader.cancel();
        controller.close();
        return;
      }
      const chunk = await reader.read();
      if (chunk.done) {
        controller.close();
        return;
      }
      const bytes = chunk.value.subarray(0, limit - read);
      read += bytes.byteLength;
      controller.enqueue(bytes);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

interface PageHead {
  /** The first content of each `<meta property|name>`, by lower-cased key. */
  meta: Map<string, string>;
  /** The first `<title>`'s text. */
  title: string;
}

/** The meta tags and title of an HTML page, read up to its `<body>`. */
async function readHead(response: Response): Promise<PageHead> {
  const head: PageHead = { meta: new Map(), title: "" };
  if (!response.body) return head;
  let titles = 0;
  let inBody = false;
  const rewriter = new HTMLRewriter()
    .on("meta", {
      element(element) {
        // The rest of a chunk is still parsed after <body> begins.
        if (inBody) return;
        const key = (
          element.getAttribute("property") ?? element.getAttribute("name")
        )
          ?.trim()
          .toLowerCase();
        const content = element.getAttribute("content");
        if (key && content !== null && !head.meta.has(key)) {
          head.meta.set(key, decodeHtml(content));
        }
      },
    })
    .on("title", {
      element() {
        titles++;
      },
      text(chunk) {
        if (titles === 1 && !inBody) head.title += chunk.text;
      },
    })
    .on("body", {
      element() {
        inBody = true;
      },
    });
  const page = new Response(
    readUpTo(response.body, MAX_PAGE_BYTES, () => inBody),
    // HTMLRewriter reads the page's charset from here.
    { headers: { "content-type": response.headers.get("content-type") ?? "" } },
  );
  await rewriter.transform(page).body?.pipeTo(new WritableStream());
  head.title = decodeHtml(head.title);
  return head;
}

/** The first of `keys` whose content, read against `base`, is HTTPS. */
function addressIn(head: PageHead, keys: Array<string>, base: URL) {
  for (const key of keys) {
    const value = head.meta.get(key)?.trim();
    if (!value) continue;
    try {
      const address = directVideoAddress(new URL(value, base).href);
      if (address) return address;
    } catch {
      // Not an address; the next key may be.
    }
  }
  return null;
}

/** A title as a block keeps it: trimmed, one line, at most 200 characters. */
function cleanTitle(value: string | undefined) {
  const title = value?.replace(/\s+/g, " ").trim().slice(0, 200);
  return title || null;
}

/**
 * Whether `address` answers a video file. Only its first byte is asked for,
 * since servers that do not answer HEAD still answer a range.
 */
async function isVideoFile(address: string) {
  const url = new URL(address);
  const fetched = await get(
    url,
    { accept: "video/*", range: "bytes=0-0" },
    AbortSignal.timeout(TIMEOUT_MS),
  );
  if (fetched.error) {
    warnLookupFailed(url, { step: "video", ...fetched.error });
    return false;
  }
  const { response } = fetched.data;
  await response.body?.cancel();
  const type = mediaType(response);
  if (response.ok && type.startsWith("video/")) return true;
  warnLookupFailed(url, {
    step: "video",
    status: response.status,
    contentType: type,
  });
  return false;
}

/**
 * The video a page names, when it is a video file: not one whose declared
 * og:video:type is something else, such as a player page's `text/html`.
 */
async function pageVideo(head: PageHead, base: URL) {
  const candidate = addressIn(head, VIDEO_KEYS, base);
  if (!candidate) return null;
  const declared = head.meta.get("og:video:type")?.trim().toLowerCase();
  if (declared && !declared.startsWith("video/")) return null;
  return (await isVideoFile(candidate)) ? candidate : null;
}

/**
 * What `address` is for a Direct Video: a video file, a page and what it
 * says about its video, or neither. The addresses returned are the ones
 * given, not where they redirect to, since a redirect target may be
 * temporary (a signed CDN address).
 */
export async function resolveDirectVideo(
  address: string,
): Promise<DirectVideoLookup> {
  const submitted = directVideoAddress(address.trim());
  if (!submitted) return { kind: "unsupported" };
  const url = new URL(submitted);

  const fetched = await get(
    url,
    { accept: "text/html,application/xhtml+xml,video/*;q=0.9,*/*;q=0.8" },
    AbortSignal.timeout(TIMEOUT_MS),
  );
  if (fetched.error) {
    warnLookupFailed(url, { step: "address", ...fetched.error });
    return { kind: "unreachable" };
  }
  const { response, url: finalUrl } = fetched.data;
  const type = mediaType(response);
  if (!response.ok) {
    await response.body?.cancel();
    warnLookupFailed(url, { step: "address", status: response.status });
    return { kind: "unreachable" };
  }
  if (type.startsWith("video/")) {
    await response.body?.cancel();
    return { kind: "file", src: submitted };
  }
  if (type !== "text/html" && type !== "application/xhtml+xml") {
    await response.body?.cancel();
    warnLookupFailed(url, { step: "address", contentType: type });
    return { kind: "unsupported" };
  }

  let head: PageHead;
  try {
    head = await readHead(response);
  } catch (error) {
    warnLookupFailed(url, { step: "address", error: errorMessage(error) });
    return { kind: "unreachable" };
  }
  // Relative addresses on the page are relative to where it was served.
  return {
    kind: "page",
    pageUrl: submitted,
    src: await pageVideo(head, finalUrl),
    title: cleanTitle(head.meta.get("og:title")) ?? cleanTitle(head.title),
    cover: addressIn(head, COVER_KEYS, finalUrl),
  };
}
