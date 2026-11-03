// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readVideoDuration } from "./read-duration";

/** The video element the reader creates, so a test can play the browser. */
let video: HTMLVideoElement;

beforeEach(() => {
  vi.useFakeTimers();
  const create = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      const element = create(tag, options);
      if (tag === "video") {
        video = element as HTMLVideoElement;
        video.load = vi.fn();
      }
      return element;
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setDuration(seconds: number) {
  Object.defineProperty(video, "duration", {
    value: seconds,
    configurable: true,
  });
}

it("reads only the header of the file, in a video that is never on the page", async () => {
  const read = readVideoDuration("https://a.test/v.mp4");

  expect(video.preload).toBe("metadata");
  expect(video.getAttribute("src")).toBe("https://a.test/v.mp4");
  expect(video.isConnected).toBe(false);

  setDuration(94.6);
  video.onloadedmetadata?.(new Event("loadedmetadata"));
  await expect(read).resolves.toBe(95);
  // The download is dropped once the length is known.
  expect(video.hasAttribute("src")).toBe(false);
});

it("gives null for a file the browser cannot read", async () => {
  const read = readVideoDuration("https://a.test/v.mp4");
  video.onerror?.(new Event("error"));
  await expect(read).resolves.toBeNull();
});

it("gives null for a length that is not a finite number of seconds", async () => {
  for (const seconds of [Number.POSITIVE_INFINITY, Number.NaN, 0.2]) {
    const read = readVideoDuration("https://a.test/live");
    setDuration(seconds);
    video.onloadedmetadata?.(new Event("loadedmetadata"));
    await expect(read).resolves.toBeNull();
  }
});

it("gives up after the timeout instead of holding the Admin up", async () => {
  let settled = false;
  const read = readVideoDuration("https://a.test/slow.mp4", 1500).then(
    (seconds) => {
      settled = true;
      return seconds;
    },
  );
  await vi.advanceTimersByTimeAsync(1499);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expect(read).resolves.toBeNull();
});
