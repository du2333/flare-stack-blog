import { describe, expect, it } from "vitest";
import {
  directVideoAddress,
  directVideoAttrs,
  directVideoOf,
  formatVideoDuration,
  parseVideoInput,
  videoCoverUrl,
  videoMetaOf,
  videoEmbedUrl,
  videoPageUrl,
  videoSourceOf,
  videoThumbnailUrl,
} from "./video-source";

function sourceOf(text: string) {
  const input = parseVideoInput(text);
  return input.kind === "video" ? input.source : input.kind;
}

describe("parseVideoInput", () => {
  it("reads Bilibili video pages, with their part and start time", () => {
    expect(sourceOf("https://www.bilibili.com/video/BV1fK4y1s7Qf/")).toEqual({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: null,
      start: null,
    });
    expect(
      sourceOf(
        "https://m.bilibili.com/video/BV1fK4y1s7Qf?p=3&t=95&vd_source=abc",
      ),
    ).toEqual({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 3,
      start: 95,
    });
    expect(sourceOf("bilibili.com/video/av170001")).toMatchObject({
      videoId: "av170001",
    });
  });

  it("treats Bilibili part 1 as no part", () => {
    expect(
      sourceOf("https://www.bilibili.com/video/BV1fK4y1s7Qf?p=1"),
    ).toMatchObject({ page: null });
  });

  it("reads a Bilibili embed code's player link", () => {
    expect(
      sourceOf(
        '<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=170001&bvid=BV1fK4y1s7Qf&cid=1&p=2" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>',
      ),
    ).toEqual({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 2,
      start: null,
    });
    expect(
      sourceOf("https://player.bilibili.com/player.html?aid=170001"),
    ).toMatchObject({ videoId: "av170001" });
  });

  it("reads YouTube watch, short, Shorts and embed links", () => {
    const video = {
      provider: "youtube",
      videoId: "5gIf0_xpFPI",
      page: null,
      start: null,
    };
    expect(sourceOf("https://www.youtube.com/watch?v=5gIf0_xpFPI")).toEqual(
      video,
    );
    expect(
      sourceOf("https://youtu.be/5gIf0_xpFPI?si=N1WTorLKL0uwLsU_"),
    ).toEqual(video);
    expect(sourceOf("https://www.youtube.com/shorts/5gIf0_xpFPI")).toEqual(
      video,
    );
    expect(
      sourceOf(
        '<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/5gIf0_xpFPI?si=x" title="YouTube video player" allowfullscreen></iframe>',
      ),
    ).toEqual(video);
  });

  it("reads YouTube start times in seconds or h/m/s", () => {
    expect(
      sourceOf("https://www.youtube.com/watch?v=5gIf0_xpFPI&t=1m30s"),
    ).toMatchObject({ start: 90 });
    expect(sourceOf("https://youtu.be/5gIf0_xpFPI?t=42")).toMatchObject({
      start: 42,
    });
  });

  it("asks for the full link instead of a b23.tv short link", () => {
    expect(parseVideoInput("https://b23.tv/abc123")).toEqual({
      kind: "shortLink",
    });
  });

  it("rejects other sites, malformed IDs and text around a link", () => {
    expect(sourceOf("https://vimeo.com/76979871")).toBe("unsupported");
    expect(sourceOf("https://www.bilibili.com/video/BV123")).toBe(
      "unsupported",
    );
    expect(sourceOf("https://www.youtube.com/watch?v=short")).toBe(
      "unsupported",
    );
    expect(sourceOf("https://www.bilibili.com/")).toBe("unsupported");
    expect(sourceOf("看这个 https://www.bilibili.com/video/BV1fK4y1s7Qf")).toBe(
      "unsupported",
    );
    expect(sourceOf("javascript:alert(1)")).toBe("unsupported");
    expect(sourceOf("")).toBe("unsupported");
  });
});

describe("videoSourceOf", () => {
  it("accepts stored attributes that name a supported video", () => {
    expect(
      videoSourceOf({
        provider: "bilibili",
        videoId: "BV1fK4y1s7Qf",
        page: 2,
        start: null,
      }),
    ).toEqual({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 2,
      start: null,
    });
  });

  it("rejects empty blocks and attributes that could escape the player URL", () => {
    expect(videoSourceOf({ provider: null, videoId: null })).toBeNull();
    expect(
      videoSourceOf({ provider: "youtube", videoId: "x/../../evil" }),
    ).toBeNull();
    expect(
      videoSourceOf({ provider: "vimeo", videoId: "5gIf0_xpFPI" }),
    ).toBeNull();
  });
});

describe("video URLs", () => {
  const bilibili = {
    provider: "bilibili",
    videoId: "BV1fK4y1s7Qf",
    page: 2,
    start: 30,
  } as const;
  const youtube = {
    provider: "youtube",
    videoId: "5gIf0_xpFPI",
    page: null,
    start: 90,
  } as const;

  it("builds players that only autoplay when asked", () => {
    expect(videoEmbedUrl(bilibili)).toBe(
      "https://player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=2&t=30&autoplay=0",
    );
    expect(videoEmbedUrl(youtube, { autoplay: true })).toBe(
      "https://www.youtube-nocookie.com/embed/5gIf0_xpFPI?start=90&autoplay=1",
    );
    expect(
      videoEmbedUrl({
        ...bilibili,
        videoId: "av170001",
        page: null,
        start: null,
      }),
    ).toBe("https://player.bilibili.com/player.html?aid=170001&autoplay=0");
  });

  it("links each video's page on its site", () => {
    expect(videoPageUrl(bilibili)).toBe(
      "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=30",
    );
    expect(videoPageUrl(youtube)).toBe(
      "https://www.youtube.com/watch?v=5gIf0_xpFPI&t=90s",
    );
  });

  it("has a fixed thumbnail only for YouTube", () => {
    expect(videoThumbnailUrl(youtube)).toBe(
      "https://i.ytimg.com/vi/5gIf0_xpFPI/hqdefault.jpg",
    );
    expect(videoThumbnailUrl(bilibili)).toBeNull();
  });
});

describe("videoMetaOf", () => {
  it("keeps a cover on Bilibili's CDN, over HTTPS, a trimmed title and a sane length", () => {
    expect(
      videoMetaOf({
        title: "  标题  ",
        cover: "http://i0.hdslb.com/bfs/archive/a.jpg?x=1",
        duration: 252,
      }),
    ).toEqual({
      title: "标题",
      cover: "https://i0.hdslb.com/bfs/archive/a.jpg",
      duration: 252,
    });
  });

  it("drops covers elsewhere and nonsense values", () => {
    expect(
      videoMetaOf({
        title: "",
        cover: "https://evil.example/bfs/a.jpg",
        duration: -1,
      }),
    ).toEqual({ title: null, cover: null, duration: null });
    expect(videoMetaOf(null)).toEqual({
      title: null,
      cover: null,
      duration: null,
    });
  });
});

describe("directVideoAddress", () => {
  it.each([
    ["https://cdn.example.com/a b.mp4", "https://cdn.example.com/a%20b.mp4"],
    ["HTTPS://CDN.example.com/v.mp4?t=1", "https://cdn.example.com/v.mp4?t=1"],
  ])("keeps %j as %j", (value, address) => {
    expect(directVideoAddress(value)).toBe(address);
  });

  it.each([
    "http://cdn.example.com/v.mp4",
    "//cdn.example.com/v.mp4",
    "/videos/v.mp4",
    "javascript:alert(1)",
    "data:video/mp4;base64,AAAA",
    "https://user:pass@cdn.example.com/v.mp4",
    "https://user@cdn.example.com/v.mp4",
    "",
    "   ",
    42,
    null,
  ])("refuses %j", (value) => {
    expect(directVideoAddress(value)).toBeNull();
  });
});

describe("directVideoOf", () => {
  it("reads a Direct Video with its HTTPS addresses, title and length", () => {
    expect(
      directVideoOf({
        provider: "direct",
        videoId: null,
        src: "https://cdn.example.com/v.mp4",
        pageUrl: "https://example.com/watch/1",
        title: "  片头  ",
        cover: "https://cdn.example.com/v.jpg",
        duration: 95,
      }),
    ).toEqual({
      src: "https://cdn.example.com/v.mp4",
      pageUrl: "https://example.com/watch/1",
      title: "片头",
      cover: "https://cdn.example.com/v.jpg",
      duration: 95,
    });
  });

  it("drops a poster or page that is not HTTPS, and nonsense values", () => {
    expect(
      directVideoOf({
        provider: "direct",
        src: "https://cdn.example.com/v.mp4",
        pageUrl: "javascript:alert(1)",
        title: "",
        cover: "http://cdn.example.com/v.jpg",
        duration: -1,
      }),
    ).toEqual({
      src: "https://cdn.example.com/v.mp4",
      pageUrl: null,
      title: null,
      cover: null,
      duration: null,
    });
  });

  it("is no Direct Video without an HTTPS file or the direct provider", () => {
    for (const src of [null, "http://cdn.example.com/v.mp4", "javascript:x"]) {
      expect(directVideoOf({ provider: "direct", src })).toBeNull();
    }
    expect(
      directVideoOf({ provider: "youtube", src: "https://cdn.example.com/v" }),
    ).toBeNull();
    expect(directVideoOf(null)).toBeNull();
  });

  it("is not a provider's video", () => {
    expect(
      videoSourceOf({ provider: "direct", src: "https://cdn.example.com/v" }),
    ).toBeNull();
  });

  it("writes block attributes with no provider video parts", () => {
    const video = {
      src: "https://cdn.example.com/v.mp4",
      pageUrl: null,
      title: "T",
      cover: null,
      duration: 3,
    };
    expect(directVideoAttrs(video)).toEqual({
      provider: "direct",
      videoId: null,
      page: null,
      start: null,
      ...video,
    });
    expect(directVideoOf(directVideoAttrs(video))).toEqual(video);
  });
});

describe("video display helpers", () => {
  it("asks the CDN for a 16:9 crop", () => {
    expect(videoCoverUrl("https://i0.hdslb.com/bfs/archive/a.jpg", 960)).toBe(
      "https://i0.hdslb.com/bfs/archive/a.jpg@960w_540h_1c.webp",
    );
  });

  it("formats lengths as m:ss, and h:mm:ss from an hour", () => {
    expect(formatVideoDuration(252)).toBe("4:12");
    expect(formatVideoDuration(3725)).toBe("1:02:05");
  });
});
