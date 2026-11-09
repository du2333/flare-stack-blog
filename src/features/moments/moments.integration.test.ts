import { createAdminTestContext, createTestContext } from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import * as MediaRepo from "@/features/media/data/media.data";
import * as MediaService from "@/features/media/service/media.service";
import * as MomentRepo from "@/features/moments/data/moments.data";
import * as MomentService from "@/features/moments/services/moments.service";
import * as PostMediaRepo from "@/features/posts/data/post-media.data";
import { fetchVideoMeta } from "@/features/posts/services/video-meta.service";
import { MomentImagesTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

vi.mock("@/features/posts/services/video-meta.service", () => ({
  fetchVideoMeta: vi.fn(),
}));

const lookUpVideo = vi.mocked(fetchVideoMeta);

const BILIBILI_META = {
  title: "A Bilibili video",
  cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
  duration: 321,
};

async function seedMedia(
  key: string,
  size?: { width: number; height: number },
) {
  const { db } = createAdminTestContext();
  return await MediaRepo.insertMedia(db, {
    key,
    url: `/images/${key}`,
    fileName: key,
    mimeType: "image/png",
    sizeInBytes: 10,
    width: size?.width,
    height: size?.height,
  });
}

function post(input: Parameters<typeof MomentService.createMoment>[1]) {
  return MomentService.createMoment(createAdminTestContext(), input);
}

function edit(input: Parameters<typeof MomentService.updateMoment>[1]) {
  return MomentService.updateMoment(createAdminTestContext(), input);
}

function reader() {
  return createTestContext();
}

beforeEach(() => {
  lookUpVideo.mockReset();
  lookUpVideo.mockResolvedValue(BILIBILI_META);
  vi.mocked(purgeWorkersCache).mockClear();
});

describe("what a Moment may hold", () => {
  it("is never empty", async () => {
    expect((await post({})).error?.reason).toBe("MOMENT_EMPTY");
    expect((await post({ text: "  \n " })).error?.reason).toBe("MOMENT_EMPTY");
    expect((await post({ text: "", images: [] })).error?.reason).toBe(
      "MOMENT_EMPTY",
    );
  });

  it("holds at most 1000 characters, counted in code points, trimmed", async () => {
    const emoji = unwrap(await post({ text: "😀".repeat(1000) }));
    expect(emoji.text).toBe("😀".repeat(1000));

    const trimmed = unwrap(await post({ text: `  ${"a".repeat(1000)}\n` }));
    expect(trimmed.text).toBe("a".repeat(1000));

    const long = await post({ text: "字".repeat(1001) });
    expect(long.error).toEqual({
      reason: "MOMENT_TEXT_TOO_LONG",
      limit: 1000,
      length: 1001,
    });
  });

  it("keeps line breaks and tabs but refuses other control and format characters", async () => {
    const lines = unwrap(await post({ text: "one\ntwo\tthree" }));
    expect(lines.text).toBe("one\ntwo\tthree");
    for (const text of ["a\u0000b", "a​b", "a‮b"]) {
      expect((await post({ text })).error?.reason, text).toBe(
        "MOMENT_TEXT_INVALID",
      );
    }
  });

  it("shows up to 50 images, each existing Media, in order", async () => {
    const keys = await Promise.all(
      Array.from({ length: 51 }, (_, i) =>
        seedMedia(`many-${i}.png`).then((media) => media.key),
      ),
    );
    const images = keys.map((key) => `/images/${key}`);

    const tooMany = await post({ images });
    expect(tooMany.error).toEqual({
      reason: "MOMENT_TOO_MANY_IMAGES",
      limit: 50,
      count: 51,
    });

    const fifty = unwrap(await post({ images: images.slice(0, 50).reverse() }));
    expect(fifty.images.map((image) => image.key)).toEqual(
      keys.slice(0, 50).reverse(),
    );
  });

  it("names images by Media path, alone or on the blog's own address", async () => {
    await seedMedia("path.png", { width: 640, height: 480 });
    const moment = unwrap(
      await post({
        images: ["/images/path.png", "https://example.com/images/path.png?v=2"],
      }),
    );
    expect(moment.images).toEqual([
      { key: "path.png", url: "/images/path.png", width: 640, height: 480 },
      { key: "path.png", url: "/images/path.png", width: 640, height: 480 },
    ]);

    const external = await post({
      images: ["https://elsewhere.example/images/path.png", "path.png"],
    });
    expect(external.error).toEqual({
      reason: "MOMENT_IMAGE_INVALID",
      images: ["https://elsewhere.example/images/path.png", "path.png"],
    });

    const missing = await post({ images: ["/images/nowhere.png"] });
    expect(missing.error).toEqual({
      reason: "MOMENT_IMAGE_NOT_FOUND",
      images: ["/images/nowhere.png"],
    });
  });

  it("has images or a video, never both", async () => {
    await seedMedia("both.png");
    const both = await post({
      images: ["/images/both.png"],
      video: { url: "https://youtu.be/dQw4w9WgXcQ" },
    });
    expect(both.error?.reason).toBe("MOMENT_IMAGES_AND_VIDEO");

    const withImages = unwrap(await post({ images: ["/images/both.png"] }));
    const addVideo = await edit({
      id: withImages.id,
      data: { video: { url: "https://youtu.be/dQw4w9WgXcQ" } },
    });
    expect(addVideo.error?.reason).toBe("MOMENT_IMAGES_AND_VIDEO");

    const swapped = unwrap(
      await edit({
        id: withImages.id,
        data: { images: [], video: { url: "https://youtu.be/dQw4w9WgXcQ" } },
      }),
    );
    expect(swapped.images).toEqual([]);
    expect(swapped.video?.provider).toBe("youtube");
    const { db } = createAdminTestContext();
    expect(await db.select().from(MomentImagesTable)).toEqual([]);
  });

  it("looks up a Bilibili or YouTube video's title, cover and length once", async () => {
    const moment = unwrap(
      await post({
        text: "看这个",
        video: { url: "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=90" },
      }),
    );
    expect(moment.video).toEqual({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 2,
      start: 90,
      ...BILIBILI_META,
      src: null,
      pageUrl: null,
    });
    expect(lookUpVideo).toHaveBeenCalledTimes(1);

    // The same video again keeps what was found, without asking.
    const again = unwrap(
      await edit({
        id: moment.id,
        data: {
          video: { url: "https://www.bilibili.com/video/BV1fK4y1s7Qf?p=2" },
        },
      }),
    );
    expect(again.video).toMatchObject({ ...BILIBILI_META, start: null });
    expect(lookUpVideo).toHaveBeenCalledTimes(1);
  });

  it("leaves a video's details empty when the lookup fails", async () => {
    lookUpVideo.mockRejectedValue(new Error("refused"));
    const moment = unwrap(
      await post({ video: { url: "https://youtu.be/dQw4w9WgXcQ?t=5" } }),
    );
    expect(moment.video).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      page: null,
      start: 5,
      title: null,
      cover: null,
      duration: null,
      src: null,
      pageUrl: null,
    });
  });

  it("keeps a Direct Video as given, requesting nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const moment = unwrap(
      await post({
        video: {
          src: "https://video.example/clip.mp4",
          poster: "https://video.example/poster.jpg",
          title: "  A clip  ",
          page: "https://video.example/watch/1",
        },
      }),
    );
    expect(moment.video).toEqual({
      provider: "direct",
      videoId: null,
      page: null,
      start: null,
      title: "A clip",
      cover: "https://video.example/poster.jpg",
      duration: null,
      src: "https://video.example/clip.mp4",
      pageUrl: "https://video.example/watch/1",
    });
    const asked = fetchSpy.mock.calls.map(([target]) =>
      String(target instanceof Request ? target.url : target),
    );
    expect(asked.filter((url) => url.includes("video.example"))).toEqual([]);
    expect(lookUpVideo).not.toHaveBeenCalled();
  });

  it("stores the length of a Direct Video as given and keeps it while the file stays", async () => {
    const src = "https://video.example/clip.mp4";
    const moment = unwrap(await post({ video: { src, duration: 95 } }));
    expect(moment.video?.duration).toBe(95);

    const retitled = unwrap(
      await edit({
        id: moment.id,
        data: { video: { src, title: "A clip" } },
      }),
    );
    expect(retitled.video).toMatchObject({ title: "A clip", duration: 95 });

    const remeasured = unwrap(
      await edit({ id: moment.id, data: { video: { src, duration: 96 } } }),
    );
    expect(remeasured.video?.duration).toBe(96);

    const another = unwrap(
      await edit({
        id: moment.id,
        data: { video: { src: "https://video.example/other.mp4" } },
      }),
    );
    expect(another.video?.duration).toBeNull();
  });

  it("refuses a video that is no Bilibili or YouTube video, or not at https addresses", async () => {
    expect(
      (await post({ video: { url: "https://vimeo.com/1" } })).error,
    ).toEqual({
      reason: "MOMENT_VIDEO_INVALID",
      detail: "UNSUPPORTED_LINK",
      addresses: ["https://vimeo.com/1"],
    });
    expect(
      (await post({ video: { url: "https://b23.tv/abc" } })).error,
    ).toMatchObject({ detail: "SHORT_LINK" });
    expect(
      (
        await post({
          video: {
            src: "http://video.example/clip.mp4",
            poster: "javascript:alert(1)",
          },
        })
      ).error,
    ).toEqual({
      reason: "MOMENT_VIDEO_INVALID",
      detail: "NOT_HTTPS",
      addresses: ["http://video.example/clip.mp4", "javascript:alert(1)"],
    });
  });
});

describe("editing a Moment", () => {
  it("keeps the time it was posted and the fields it does not state", async () => {
    await seedMedia("kept.png");
    const moment = unwrap(
      await post({ text: "before", images: ["/images/kept.png"] }),
    );
    const edited = unwrap(
      await edit({ id: moment.id, data: { text: "after" } }),
    );
    expect(edited.text).toBe("after");
    expect(edited.images.map((image) => image.key)).toEqual(["kept.png"]);
    expect(edited.postedAt).toEqual(moment.postedAt);
    expect(edited.saveToken).not.toBe(moment.saveToken);
  });

  it("refuses a save after someone else's and writes nothing", async () => {
    const moment = unwrap(await post({ text: "first" }));
    const other = unwrap(
      await edit({ id: moment.id, data: { text: "other" } }),
    );

    const stale = await edit({
      id: moment.id,
      data: { text: "mine" },
      saveToken: moment.saveToken,
    });
    expect(stale.error).toEqual({
      reason: "EDIT_CONFLICT",
      saveToken: other.saveToken,
    });
    expect(
      (await MomentService.findMomentById(createAdminTestContext(), moment.id))
        ?.text,
    ).toBe("other");

    // A save without a token overwrites.
    expect(
      unwrap(await edit({ id: moment.id, data: { text: "mine" } })).text,
    ).toBe("mine");
  });

  it("writes nothing for a save that changes nothing, but a stale token still conflicts", async () => {
    const moment = unwrap(await post({ text: "same" }));
    const unchanged = unwrap(
      await edit({
        id: moment.id,
        data: { text: "same" },
        saveToken: moment.saveToken,
      }),
    );
    expect(unchanged.saveToken).toBe(moment.saveToken);

    unwrap(await edit({ id: moment.id, data: { text: "moved on" } }));
    unwrap(await edit({ id: moment.id, data: { text: "same" } }));
    const stale = await edit({
      id: moment.id,
      data: { text: "same" },
      saveToken: moment.saveToken,
    });
    expect(stale.error?.reason).toBe("EDIT_CONFLICT");
  });

  it("answers MOMENT_NOT_FOUND for a Moment that is gone", async () => {
    const moment = unwrap(await post({ text: "gone" }));
    unwrap(await MomentService.deleteMoment(createAdminTestContext(), moment));
    expect((await edit({ id: moment.id, data: { text: "x" } })).error).toEqual({
      reason: "MOMENT_NOT_FOUND",
    });
    expect(
      (await MomentService.deleteMoment(createAdminTestContext(), moment))
        .error,
    ).toEqual({ reason: "MOMENT_NOT_FOUND" });
  });
});

describe("Media a Moment shows", () => {
  it("cannot be deleted while the Moment shows it", async () => {
    await seedMedia("shown.png");
    const moment = unwrap(await post({ images: ["/images/shown.png"] }));
    const admin = createAdminTestContext();

    expect((await MediaService.deleteImage(admin, "shown.png")).error).toEqual({
      reason: "MEDIA_IN_USE",
    });
    expect(await MediaRepo.getUnusedMediaKeys(admin.db)).not.toContain(
      "shown.png",
    );
    expect(await MediaRepo.deleteUnusedMedia(admin.db)).not.toContain(
      "shown.png",
    );
    expect(await PostMediaRepo.isMediaInUse(admin.db, "shown.png")).toBe(true);
    expect(
      await PostMediaRepo.getLinkedMediaKeys(admin.db, ["shown.png"]),
    ).toEqual(["shown.png"]);

    unwrap(await edit({ id: moment.id, data: { text: "words", images: [] } }));
    unwrap(await MediaService.deleteImage(admin, "shown.png"));
  });

  it("is counted in the media library", async () => {
    await seedMedia("counted.png");
    await seedMedia("idle.png");
    unwrap(
      await post({ images: ["/images/counted.png", "/images/counted.png"] }),
    );
    unwrap(await post({ images: ["/images/counted.png"] }));
    const { db } = createAdminTestContext();

    const { items } = await MediaRepo.getMediaList(db);
    const byKey = new Map(items.map((item) => [item.key, item]));
    expect(byKey.get("counted.png")).toMatchObject({
      postCount: 0,
      revisionOnlyPostCount: 0,
      momentCount: 2,
    });
    expect(byKey.get("idle.png")?.momentCount).toBe(0);

    const unused = await MediaRepo.getMediaList(db, { unusedOnly: true });
    expect(unused.items.map((item) => item.key)).toEqual(["idle.png"]);
    expect((await MediaRepo.getMediaStats(db)).unusedCount).toBe(1);
  });

  it("deleted before the Moment is written makes the write fail, writing nothing", async () => {
    const media = await seedMedia("raced.png");
    const { db } = createAdminTestContext();
    await MediaRepo.deleteMediaIfUnused(db, media.key);

    const write = MomentRepo.insertMoment(db, {
      text: "",
      video: null,
      mediaIds: [media.id],
    });
    await expect(write).rejects.toSatisfy(MomentRepo.isMomentImageGone);
    expect(await MomentRepo.countMoments(db)).toBe(0);
  });
});

describe("public reads", () => {
  it("lists Moments newest first, 20 a page, and answers the last page past it", async () => {
    for (let i = 1; i <= 21; i += 1)
      unwrap(await post({ text: `moment ${i}` }));

    const first = await MomentService.getMomentsPage(reader(), 1);
    expect(first.totalPages).toBe(2);
    expect(first.items).toHaveLength(20);
    expect(first.items[0].text).toBe("moment 21");

    const past = await MomentService.getMomentsPage(reader(), 9);
    expect(past.page).toBe(2);
    expect(past.items.map((item) => item.text)).toEqual(["moment 1"]);
  });

  it("answers one page and nothing else when there are no Moments", async () => {
    expect(await MomentService.getMomentsPage(reader(), 1)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
    });
    expect(await MomentService.getLatestMoments(reader())).toEqual([]);
    expect(await MomentService.momentsExist(reader())).toBe(false);
  });

  it("gets a Moment by id until it is deleted, without its saveToken", async () => {
    const moment = unwrap(await post({ text: "read me" }));
    const read = await MomentService.getMomentById(reader(), moment.id);
    expect(read).toEqual({
      id: moment.id,
      text: "read me",
      images: [],
      video: null,
      postedAt: moment.postedAt,
      updatedAt: moment.updatedAt,
      commentCount: 0,
    });

    unwrap(await MomentService.deleteMoment(createAdminTestContext(), moment));
    expect(await MomentService.getMomentById(reader(), moment.id)).toBeNull();
  });

  it("shows the latest three, and that Moments exist", async () => {
    for (let i = 1; i <= 4; i += 1) unwrap(await post({ text: `latest ${i}` }));
    const latest = await MomentService.getLatestMoments(reader());
    expect(latest.map((moment) => moment.text)).toEqual([
      "latest 4",
      "latest 3",
      "latest 2",
    ]);
    expect(await MomentService.momentsExist(reader())).toBe(true);
  });

  it("sees every write at once, through the Public Cache", async () => {
    const moment = unwrap(await post({ text: "cached" }));
    // Fill the cached entries.
    await MomentService.getMomentsPage(reader(), 1);
    await MomentService.getMomentById(reader(), moment.id);
    await MomentService.getLatestMoments(reader());

    unwrap(await edit({ id: moment.id, data: { text: "edited" } }));
    expect(
      (await MomentService.getMomentsPage(reader(), 1)).items[0].text,
    ).toBe("edited");
    expect((await MomentService.getMomentById(reader(), moment.id))?.text).toBe(
      "edited",
    );
    expect((await MomentService.getLatestMoments(reader()))[0].text).toBe(
      "edited",
    );

    unwrap(await MomentService.deleteMoment(createAdminTestContext(), moment));
    expect((await MomentService.getMomentsPage(reader(), 1)).items).toEqual([]);
    expect(await MomentService.getMomentById(reader(), moment.id)).toBeNull();
    expect(await MomentService.momentsExist(reader())).toBe(false);
  });
});

describe("Workers Caching purges", () => {
  const purged = () =>
    vi.mocked(purgeWorkersCache).mock.calls.map(([, target]) => target);

  it("purges every page with the navigation when the first Moment is posted and the last deleted", async () => {
    const first = unwrap(await post({ text: "first" }));
    expect(purged()).toEqual([{ tags: ["html"] }]);

    vi.mocked(purgeWorkersCache).mockClear();
    const second = unwrap(await post({ text: "second" }));
    unwrap(await edit({ id: first.id, data: { text: "first, edited" } }));
    unwrap(await MomentService.deleteMoment(createAdminTestContext(), second));
    expect(purged()).toEqual([
      { tags: ["moments", `moment:${second.id}`] },
      { tags: ["moments", `moment:${first.id}`] },
      { tags: ["moments", `moment:${second.id}`] },
    ]);

    vi.mocked(purgeWorkersCache).mockClear();
    unwrap(await MomentService.deleteMoment(createAdminTestContext(), first));
    expect(purged()).toEqual([{ tags: ["html"] }]);
  });

  it("purges nothing for a refused or empty-handed save", async () => {
    const moment = unwrap(await post({ text: "steady" }));
    vi.mocked(purgeWorkersCache).mockClear();

    await post({});
    await edit({ id: moment.id, data: { text: "steady" } });
    await edit({
      id: moment.id,
      data: { text: "lost" },
      saveToken: "stale-token",
    });
    expect(purgeWorkersCache).not.toHaveBeenCalled();
  });
});
