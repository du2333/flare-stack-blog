import { describe, expect, it } from "vitest";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { renderMomentFeedHtml } from "./feed-html";

const ORIGIN = "https://blog.example";

const noVideo: Pick<PublicMoment, "video" | "images"> = {
  video: null,
  images: [],
};

const bilibili: NonNullable<PublicMoment["video"]> = {
  provider: "bilibili",
  videoId: "BV1fK4y1s7Qf",
  page: 2,
  start: 90,
  title: "A <Bilibili> video",
  cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
  duration: 321,
  src: null,
  pageUrl: null,
};

const direct: NonNullable<PublicMoment["video"]> = {
  provider: "direct",
  videoId: null,
  page: null,
  start: null,
  title: "Clip",
  cover: "https://video.example/poster.jpg",
  duration: null,
  src: "https://video.example/clip.mp4",
  pageUrl: null,
};

describe("renderMomentFeedHtml", () => {
  it("escapes the text and keeps its line breaks", () => {
    expect(
      renderMomentFeedHtml({ ...noVideo, text: "a <b> & c\nd\r\ne" }, ORIGIN),
    ).toBe("<p>a &lt;b&gt; &amp; c<br>d<br>e</p>");
  });

  it("links web addresses as the public page opens links", () => {
    const html = renderMomentFeedHtml(
      { ...noVideo, text: 'go https://a.example/x?y=1&z="2". ok' },
      ORIGIN,
    );
    expect(html).toBe(
      '<p>go <a href="https://a.example/x?y=1&amp;z=" target="_blank" rel="noopener noreferrer nofollow">https://a.example/x?y=1&amp;z=</a>&quot;2&quot;. ok</p>',
    );
  });

  it("writes images with absolute addresses after the text", () => {
    const html = renderMomentFeedHtml(
      {
        text: "pics",
        video: null,
        images: [
          { key: "a.png", url: "/images/a.png", width: 1, height: 1 },
          { key: "b.png", url: "/images/b.png?v=2", width: null, height: null },
        ],
      },
      ORIGIN,
    );
    expect(html).toBe(
      '<p>pics</p><p><img src="https://blog.example/images/a.png" alt=""></p><p><img src="https://blog.example/images/b.png?v=2" alt=""></p>',
    );
  });

  it("has no text paragraph for a Moment without text", () => {
    expect(
      renderMomentFeedHtml(
        {
          text: "",
          video: null,
          images: [{ key: "a.png", url: "/images/a.png", width: 1, height: 1 }],
        },
        ORIGIN,
      ),
    ).toBe('<p><img src="https://blog.example/images/a.png" alt=""></p>');
  });

  it("writes a Bilibili video as a link to its page, as a post body does", () => {
    expect(
      renderMomentFeedHtml({ text: "", images: [], video: bilibili }, ORIGIN),
    ).toBe(
      '<p><a href="https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&amp;t=90">A &lt;Bilibili&gt; video</a></p>',
    );
  });

  it("writes a Direct Video as a video that loads nothing until played", () => {
    expect(
      renderMomentFeedHtml({ text: "", images: [], video: direct }, ORIGIN),
    ).toBe(
      '<video controls preload="none" src="https://video.example/clip.mp4" poster="https://video.example/poster.jpg"></video><p><a href="https://video.example/clip.mp4">Clip</a></p>',
    );
  });
});
