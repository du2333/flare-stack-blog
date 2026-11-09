import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vitest";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import type { MomentDraft } from "./moment-draft";
import {
  createInputOf,
  draftOfMoment,
  draftProblem,
  draftTextLength,
  draftIsEmpty,
  EMPTY_DRAFT,
  isEditConflict,
  momentErrorMessage,
  moveImage,
  updateInputOf,
  videoInputOf,
} from "./moment-draft";
import { m } from "@/paraglide/messages";

const image = (key: string) => ({
  key,
  url: `/images/${key}`,
  width: 10,
  height: 20,
});

const DIRECT = {
  src: "https://video.example/clip.mp4",
  pageUrl: "https://video.example/watch/1",
  title: "A clip",
  cover: "https://video.example/poster.jpg",
  duration: 95,
};

const YOUTUBE = {
  provider: "youtube",
  videoId: "dQw4w9WgXcQ",
  page: null,
  start: 5,
} as const;

function moment(change: Partial<PublicMoment>): PublicMoment {
  return {
    id: 1,
    text: "",
    images: [],
    video: null,
    postedAt: new Date(0),
    updatedAt: new Date(0),
    commentCount: 0,
    ...change,
  };
}

function draft(change: Partial<MomentDraft>): MomentDraft {
  return { ...EMPTY_DRAFT, ...change };
}

describe("what can be posted", () => {
  it("is never empty", () => {
    expect(draftProblem(EMPTY_DRAFT)).toBe("empty");
    expect(draftProblem(draft({ text: "  \n\t " }))).toBe("empty");
    expect(draftProblem(draft({ text: "hi" }))).toBeNull();
    expect(draftProblem(draft({ images: [image("a.png")] }))).toBeNull();
    expect(
      draftProblem(draft({ video: { kind: "direct", video: DIRECT } })),
    ).toBeNull();
  });

  it("counts the trimmed text in code points against 1000", () => {
    expect(draftTextLength(draft({ text: `  ${"😀".repeat(3)} \n` }))).toBe(3);
    expect(draftProblem(draft({ text: "😀".repeat(1000) }))).toBeNull();
    expect(draftProblem(draft({ text: `${"a".repeat(1000)}  ` }))).toBeNull();
    expect(draftProblem(draft({ text: "字".repeat(1001) }))).toBe(
      "text_too_long",
    );
  });

  it("refuses control and format characters but not line breaks", () => {
    expect(draftProblem(draft({ text: "one\ntwo\tthree" }))).toBeNull();
    expect(draftProblem(draft({ text: "a\u0000b" }))).toBe("text_invalid");
    expect(draftProblem(draft({ text: "a​b" }))).toBe("text_invalid");
  });

  it("holds at most 50 images", () => {
    const fifty = Array.from({ length: 50 }, (_, i) => image(`${i}.png`));
    expect(draftProblem(draft({ images: fifty }))).toBeNull();
    expect(draftProblem(draft({ images: [...fifty, image("x.png")] }))).toBe(
      "too_many_images",
    );
  });
});

describe("the write that posts a Moment", () => {
  it("names only what the draft has", () => {
    expect(createInputOf(draft({ text: " hello \n" }))).toEqual({
      text: "hello",
    });
    expect(
      createInputOf(draft({ images: [image("b.png"), image("a.png")] })),
    ).toEqual({ images: ["/images/b.png", "/images/a.png"] });
  });

  it("states a provider video by its link, keeping the part and start", () => {
    const input = createInputOf(
      draft({
        video: {
          kind: "provider",
          source: YOUTUBE,
          meta: { title: null, cover: null, duration: null },
        },
      }),
    );
    expect(input).toEqual({
      video: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s" },
    });
  });

  it("states a Direct Video with the length read from the file, when there is one", () => {
    expect(videoInputOf({ kind: "direct", video: DIRECT })).toEqual({
      src: DIRECT.src,
      poster: DIRECT.cover,
      title: "A clip",
      page: DIRECT.pageUrl,
      duration: 95,
    });
    expect(
      videoInputOf({ kind: "direct", video: { ...DIRECT, duration: null } }),
    ).not.toHaveProperty("duration");
  });
});

describe("the write that edits a Moment", () => {
  const initial = draftOfMoment(
    moment({ text: "kept", images: [image("a.png"), image("b.png")] }),
  );

  it("is nothing when nothing changed", () => {
    expect(updateInputOf(initial, { ...initial })).toBeNull();
    expect(updateInputOf(initial, { ...initial, text: "kept  " })).toBeNull();
  });

  it("states only the fields that changed", () => {
    expect(updateInputOf(initial, { ...initial, text: "new" })).toEqual({
      text: "new",
    });
    expect(
      updateInputOf(initial, { ...initial, images: [initial.images[1]] }),
    ).toEqual({ images: ["/images/b.png"] });
    expect(
      updateInputOf(initial, {
        ...initial,
        images: [initial.images[1], initial.images[0]],
      }),
    ).toEqual({ images: ["/images/b.png", "/images/a.png"] });
  });

  it("empties the other side when swapping images for a video and back", () => {
    const video = { kind: "direct", video: DIRECT } as const;
    expect(updateInputOf(initial, { ...initial, images: [], video })).toEqual({
      images: [],
      video: videoInputOf(video),
    });

    const withVideo = draftOfMoment(
      moment({
        video: {
          provider: "direct",
          videoId: null,
          page: null,
          start: null,
          title: DIRECT.title,
          cover: DIRECT.cover,
          duration: DIRECT.duration,
          src: DIRECT.src,
          pageUrl: DIRECT.pageUrl,
        },
      }),
    );
    expect(withVideo.video).toEqual({ kind: "direct", video: DIRECT });
    expect(
      updateInputOf(withVideo, {
        ...withVideo,
        video: null,
        images: [image("c.png")],
      }),
    ).toEqual({ images: ["/images/c.png"], video: null });
  });

  it("leaves an unchanged video out, so the server keeps what it looked up", () => {
    const withProvider = draftOfMoment(
      moment({
        text: "x",
        video: {
          provider: "youtube",
          videoId: YOUTUBE.videoId,
          page: null,
          start: 5,
          title: "Looked up",
          cover: null,
          duration: 212,
          src: null,
          pageUrl: null,
        },
      }),
    );
    expect(withProvider.video).toMatchObject({
      kind: "provider",
      meta: { title: "Looked up", duration: 212 },
    });
    expect(updateInputOf(withProvider, { ...withProvider })).toBeNull();
    expect(updateInputOf(withProvider, { ...withProvider, text: "y" })).toEqual(
      { text: "y" },
    );
  });

  it("states a Direct Video whose fields changed", () => {
    const before = draftOfMoment(
      moment({
        video: {
          provider: "direct",
          videoId: null,
          page: null,
          start: null,
          title: null,
          cover: null,
          duration: null,
          src: DIRECT.src,
          pageUrl: null,
        },
      }),
    );
    const after = {
      ...before,
      video: {
        kind: "direct",
        video: { ...DIRECT, pageUrl: null, cover: null, title: "New" },
      },
    } as const;
    expect(updateInputOf(before, after)).toEqual({
      video: videoInputOf(after.video),
    });
  });
});

describe("what a refused write says", () => {
  function refused(code: string) {
    return new ORPCError(code, { status: 400 });
  }

  it("names the rule each refusal broke", () => {
    expect(momentErrorMessage(refused("MOMENT_EMPTY"))).toBe(
      m.moment_admin_error_empty(),
    );
    expect(momentErrorMessage(refused("MOMENT_TEXT_TOO_LONG"))).toBe(
      m.moment_admin_error_text_too_long({ limit: 1000 }),
    );
    expect(momentErrorMessage(refused("MOMENT_IMAGE_NOT_FOUND"))).toBe(
      m.moment_admin_error_image_not_found(),
    );
    expect(momentErrorMessage(refused("MOMENT_VIDEO_INVALID"))).toBe(
      m.moment_admin_error_video_invalid(),
    );
    expect(momentErrorMessage(refused("MOMENT_NOT_FOUND"))).toBe(
      m.moment_admin_error_not_found(),
    );
  });

  it("falls back for anything else, a lost connection included", () => {
    expect(momentErrorMessage(new Error("Failed to fetch"))).toBe(
      m.moment_admin_error_failed(),
    );
    expect(momentErrorMessage(refused("INTERNAL_SERVER_ERROR"))).toBe(
      m.moment_admin_error_failed(),
    );
  });

  it("tells an Edit Conflict apart", () => {
    expect(isEditConflict(refused("EDIT_CONFLICT"))).toBe(true);
    expect(isEditConflict(refused("MOMENT_EMPTY"))).toBe(false);
    expect(isEditConflict(new Error("EDIT_CONFLICT"))).toBe(false);
  });
});

describe("the images of a draft", () => {
  it("move to a place, and keep their order for places that do not exist", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveImage(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveImage(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveImage(list, 1, 1)).toEqual(list);
    expect(moveImage(list, -1, 2)).toEqual(list);
    expect(moveImage(list, 1, 4)).toEqual(list);
    // The input is not changed.
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("make a draft empty only when nothing is held, whitespace included", () => {
    expect(draftIsEmpty(EMPTY_DRAFT)).toBe(true);
    expect(draftIsEmpty({ ...EMPTY_DRAFT, text: " " })).toBe(false);
    expect(draftIsEmpty({ ...EMPTY_DRAFT, images: [image("a")] })).toBe(false);
  });
});
