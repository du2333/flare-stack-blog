import { describe, expect, it, vi } from "vitest";
import type { MomentDraft } from "./moment-draft";
import { EMPTY_DRAFT } from "./moment-draft";
import {
  clearStoredDraft,
  loadStoredDraft,
  MOMENT_DRAFT_STORAGE_KEY,
  saveStoredDraft,
} from "./moment-draft-storage";

/** A storage that keeps strings, as the browser's does. */
function memory(initial?: string) {
  const items = new Map<string, string>();
  if (initial !== undefined) items.set(MOMENT_DRAFT_STORAGE_KEY, initial);
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const withImages: MomentDraft = {
  text: "words",
  images: [{ key: "a.png", url: "/images/a.png", width: 4, height: 3 }],
  video: null,
};

const withVideo: MomentDraft = {
  text: "",
  images: [],
  video: {
    kind: "direct",
    video: {
      src: "https://video.example/clip.mp4",
      pageUrl: null,
      title: "A clip",
      cover: null,
      duration: 95,
    },
  },
};

describe("the stored draft of a new Moment", () => {
  it("comes back as it was kept, images as Media paths and video as data", () => {
    const storage = memory();
    saveStoredDraft(withImages, storage);
    expect(loadStoredDraft(storage)).toEqual(withImages);

    saveStoredDraft(withVideo, storage);
    expect(loadStoredDraft(storage)).toEqual(withVideo);

    saveStoredDraft(
      {
        text: "",
        images: [],
        video: {
          kind: "provider",
          source: {
            provider: "youtube",
            videoId: "dQw4w9WgXcQ",
            page: null,
            start: 5,
          },
          meta: { title: null, cover: null, duration: null },
        },
      },
      storage,
    );
    expect(loadStoredDraft(storage)?.video?.kind).toBe("provider");
  });

  it("is removed when the draft is emptied or posted", () => {
    const storage = memory();
    saveStoredDraft(withImages, storage);
    saveStoredDraft(EMPTY_DRAFT, storage);
    expect(storage.items.size).toBe(0);

    saveStoredDraft(withImages, storage);
    clearStoredDraft(storage);
    expect(loadStoredDraft(storage)).toBeNull();
  });

  it("is ignored when what is stored cannot be read", () => {
    expect(loadStoredDraft(memory())).toBeNull();
    expect(loadStoredDraft(memory("not json"))).toBeNull();
    expect(loadStoredDraft(memory('{"text":1}'))).toBeNull();
    // Images and a video together are not a Moment.
    expect(
      loadStoredDraft(
        memory(JSON.stringify({ ...withImages, video: withVideo.video })),
      ),
    ).toBeNull();
    expect(loadStoredDraft(memory(JSON.stringify(EMPTY_DRAFT)))).toBeNull();
    expect(loadStoredDraft(null)).toBeNull();
  });

  it("never throws where storage is full or blocked", () => {
    const refusing = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("quota");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    expect(() => saveStoredDraft(withImages, refusing)).not.toThrow();
    expect(() => saveStoredDraft(EMPTY_DRAFT, refusing)).not.toThrow();
    expect(() => clearStoredDraft(refusing)).not.toThrow();
    expect(loadStoredDraft(refusing)).toBeNull();
  });
});
