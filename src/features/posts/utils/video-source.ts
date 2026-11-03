/**
 * Videos a post can embed, as the video block stores them: a provider on the
 * allowlist and that provider's video ID. Player and page URLs are built from
 * these parts, never taken from the author, so a post cannot point an iframe
 * anywhere else.
 *
 * A Direct Video (provider `"direct"`) is the other kind: a video file at any
 * HTTPS address, played by the reader's browser in a `<video>`, which runs no
 * other site's script (ADR 0036). `VideoProvider` and `videoSourceOf` leave
 * it out; `directVideoOf` reads it.
 */

export type VideoProvider = "bilibili" | "youtube";

export interface VideoSource {
  provider: VideoProvider;
  /** A Bilibili `BV…` or `av…` ID, or an 11-character YouTube ID. */
  videoId: string;
  /** The Bilibili part (分P), from 1; `null` for the first part and YouTube. */
  page: number | null;
  /** Where playback starts, in seconds; `null` for the start. */
  start: number | null;
}

/**
 * What the provider says about a video, looked up once when it is embedded
 * and kept on the block, so readers never wait on the provider's API.
 */
export interface VideoMeta {
  title: string | null;
  /** The provider's cover image, on its image CDN. */
  cover: string | null;
  /** The video's (or Bilibili part's) length in seconds. */
  duration: number | null;
}

export const EMPTY_VIDEO_META: VideoMeta = {
  title: null,
  cover: null,
  duration: null,
};

/**
 * A Direct Video as its block stores it. Every address is HTTPS without a
 * user name or password; the CMS keeps the addresses only and does not know
 * whether the file is still there.
 */
export interface DirectVideo {
  /** The video file, played by the reader's browser. */
  src: string;
  /** The page the video was found on, linked under the player. */
  pageUrl: string | null;
  title: string | null;
  /** The poster shown before the video plays. */
  cover: string | null;
  /** The file's length in seconds, as the editor read it from the file. */
  duration: number | null;
}

/**
 * What the server found at an address the Admin gave for a Direct Video,
 * shared by the endpoint that looks addresses up and the editor.
 */
export type DirectVideoLookup =
  /** The address is a video file. */
  | { kind: "file"; src: string }
  /**
   * The address is a web page; `src` is a video file the page names and the
   * server confirmed is one, or null when it names none.
   */
  | {
      kind: "page";
      pageUrl: string;
      src: string | null;
      title: string | null;
      cover: string | null;
    }
  /** The request failed, timed out or answered other than 2xx. */
  | { kind: "unreachable" }
  /** The address answered neither a video file nor an HTML page. */
  | { kind: "unsupported" };

/** What reading a pasted link or embed code found. */
export type VideoInput =
  | { kind: "video"; source: VideoSource }
  | { kind: "shortLink" }
  | { kind: "unsupported" };

const BILIBILI_BV = /^BV[0-9A-Za-z]{10}$/;
const BILIBILI_AV = /^av(\d{1,12})$/i;
const YOUTUBE_ID = /^[\w-]{11}$/;
const IFRAME_SRC = /<iframe\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i;

function positiveInt(value: string | null, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 && parsed <= max ? parsed : null;
}

/** `90`, `90s` or `1h2m3s` as seconds. */
function parseStart(value: string | null): number | null {
  if (!value) return null;
  const plain = positiveInt(value.replace(/s$/i, ""), 86_400);
  if (plain !== null) return plain;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
  if (!match || !match[0]) return null;
  const seconds =
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0);
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
}

function bilibiliId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (BILIBILI_BV.test(value)) return value;
  const av = BILIBILI_AV.exec(value);
  return av ? `av${av[1]}` : null;
}

function toUrl(text: string): URL | null {
  let candidate = text.trim();
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  else if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function hostIs(url: URL, domain: string) {
  return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
}

function fromUrl(url: URL): VideoInput {
  if (hostIs(url, "b23.tv")) return { kind: "shortLink" };

  if (hostIs(url, "bilibili.com")) {
    const params = url.searchParams;
    const fromPlayer =
      url.hostname === "player.bilibili.com"
        ? (bilibiliId(params.get("bvid")) ??
          bilibiliId(params.get("aid") && `av${params.get("aid")}`))
        : null;
    const fromPage = /^\/video\/([^/]+)/.exec(url.pathname)?.[1];
    const videoId = fromPlayer ?? bilibiliId(fromPage);
    if (!videoId) return { kind: "unsupported" };
    const page = positiveInt(params.get("p") ?? params.get("page"), 9999);
    return {
      kind: "video",
      source: {
        provider: "bilibili",
        videoId,
        page: page && page > 1 ? page : null,
        start: parseStart(params.get("t")),
      },
    };
  }

  const isYoutube =
    hostIs(url, "youtube.com") || hostIs(url, "youtube-nocookie.com");
  if (isYoutube || url.hostname === "youtu.be") {
    const path = url.pathname.split("/").filter(Boolean);
    const candidate = isYoutube
      ? path[0] === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live", "v"].includes(path[0] ?? "")
          ? path[1]
          : null
      : path[0];
    if (!candidate || !YOUTUBE_ID.test(candidate)) {
      return { kind: "unsupported" };
    }
    return {
      kind: "video",
      source: {
        provider: "youtube",
        videoId: candidate,
        page: null,
        start: parseStart(
          url.searchParams.get("t") ?? url.searchParams.get("start"),
        ),
      },
    };
  }

  return { kind: "unsupported" };
}

/**
 * Reads what an author pasted: a video page link, a player link, or a
 * provider's `<iframe>` embed code.
 */
export function parseVideoInput(text: string): VideoInput {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "unsupported" };
  const embedSrc = IFRAME_SRC.exec(trimmed)?.[1];
  if (!embedSrc && /\s/.test(trimmed)) return { kind: "unsupported" };
  const url = toUrl(embedSrc ?? trimmed);
  return url ? fromUrl(url) : { kind: "unsupported" };
}

/**
 * A video block's attributes as a source, or `null` when they do not name a
 * supported video (an empty block, or content written around the editor).
 */
export function videoSourceOf(
  attrs: Record<string, unknown> | null | undefined,
): VideoSource | null {
  if (!attrs) return null;
  const { provider, videoId } = attrs;
  if (typeof videoId !== "string") return null;
  const page =
    typeof attrs.page === "number" && Number.isInteger(attrs.page)
      ? attrs.page
      : null;
  const start =
    typeof attrs.start === "number" && Number.isInteger(attrs.start)
      ? attrs.start
      : null;
  if (provider === "bilibili" && bilibiliId(videoId) === videoId) {
    return {
      provider,
      videoId,
      page: page && page > 1 && page <= 9999 ? page : null,
      start: start && start > 0 && start <= 86_400 ? start : null,
    };
  }
  if (provider === "youtube" && YOUTUBE_ID.test(videoId)) {
    return {
      provider,
      videoId,
      page: null,
      start: start && start > 0 && start <= 86_400 ? start : null,
    };
  }
  return null;
}

/** Bilibili serves covers from its own image CDN, over HTTPS. */
function bilibiliCover(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = toUrl(value);
  if (!url || !hostIs(url, "hdslb.com") || !url.pathname.startsWith("/bfs/")) {
    return null;
  }
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function titleOf(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 200)
    : null;
}

function durationOf(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value < 360_000
    ? value
    : null;
}

/**
 * A video block's stored metadata, keeping only values that are safe to
 * show: a cover on the provider's CDN, a short title, a sane length.
 */
export function videoMetaOf(
  attrs: Record<string, unknown> | null | undefined,
): VideoMeta {
  if (!attrs) return EMPTY_VIDEO_META;
  return {
    title: titleOf(attrs.title),
    cover: bilibiliCover(attrs.cover),
    duration: durationOf(attrs.duration),
  };
}

/**
 * `value` as an address a Direct Video may use: HTTPS, with no user name or
 * password, written out in full. Anything else is null, so no other scheme,
 * `javascript:` among them, reaches a page through a Direct Video.
 */
export function directVideoAddress(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/**
 * A video block's attributes as a Direct Video, or `null` when they are not
 * one or its file is not at an address `directVideoAddress` accepts. A
 * poster or page address it does not accept is dropped, and the title and
 * length are kept as `videoMetaOf` keeps them.
 */
export function directVideoOf(
  attrs: Record<string, unknown> | null | undefined,
): DirectVideo | null {
  if (attrs?.provider !== "direct") return null;
  const src = directVideoAddress(attrs.src);
  if (!src) return null;
  return {
    src,
    pageUrl: directVideoAddress(attrs.pageUrl),
    title: titleOf(attrs.title),
    cover: directVideoAddress(attrs.cover),
    duration: durationOf(attrs.duration),
  };
}

/**
 * `video` as the attributes of its block, every one the editor gives it, with
 * no provider video parts.
 */
export function directVideoAttrs(video: DirectVideo) {
  return {
    provider: "direct",
    videoId: null,
    page: null,
    start: null,
    title: video.title,
    cover: video.cover,
    duration: video.duration,
    src: video.src,
    pageUrl: video.pageUrl,
  } as const;
}

/** `cover` resized by the CDN to fill a 16:9 frame `width` pixels wide. */
export function videoCoverUrl(cover: string, width: number): string {
  return `${cover}@${width}w_${Math.round((width * 9) / 16)}h_1c.webp`;
}

/** A length as `m:ss`, or `h:mm:ss` from an hour on. */
export function formatVideoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** The provider's player, for an iframe. */
export function videoEmbedUrl(
  source: VideoSource,
  { autoplay = false }: { autoplay?: boolean } = {},
): string {
  if (source.provider === "bilibili") {
    const url = new URL("https://player.bilibili.com/player.html");
    const av = BILIBILI_AV.exec(source.videoId);
    if (av) url.searchParams.set("aid", av[1]);
    else url.searchParams.set("bvid", source.videoId);
    if (source.page) url.searchParams.set("p", String(source.page));
    if (source.start) url.searchParams.set("t", String(source.start));
    url.searchParams.set("autoplay", autoplay ? "1" : "0");
    return url.toString();
  }
  const url = new URL(
    `https://www.youtube-nocookie.com/embed/${source.videoId}`,
  );
  if (source.start) url.searchParams.set("start", String(source.start));
  if (autoplay) url.searchParams.set("autoplay", "1");
  return url.toString();
}

/** The video's page on its provider's site. */
export function videoPageUrl(source: VideoSource): string {
  if (source.provider === "bilibili") {
    const url = new URL(`https://www.bilibili.com/video/${source.videoId}/`);
    if (source.page) url.searchParams.set("p", String(source.page));
    if (source.start) url.searchParams.set("t", String(source.start));
    return url.toString();
  }
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", source.videoId);
  if (source.start) url.searchParams.set("t", `${source.start}s`);
  return url.toString();
}

/** A still for the video, where the provider has one at a fixed URL. */
export function videoThumbnailUrl(source: VideoSource): string | null {
  return source.provider === "youtube"
    ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg`
    : null;
}
