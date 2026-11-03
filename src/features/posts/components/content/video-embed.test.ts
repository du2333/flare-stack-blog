// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { DirectVideoEmbed } from "./video-embed";

afterEach(cleanup);

const VIDEO = {
  src: "https://cdn.example.com/clip.mp4",
  pageUrl: "https://example.com/watch/1",
  title: "A clip",
  cover: "https://example.com/cover.jpg",
  duration: 95,
};

it("plays the file in the browser's own player only after a click, filling the frame", () => {
  const { container } = render(
    createElement(DirectVideoEmbed, { video: VIDEO }),
  );
  expect(container.querySelector("video")).toBeNull();

  fireEvent.click(
    screen.getByRole("button", {
      name: m.post_video_play_direct_title({ title: "A clip" }),
    }),
  );

  const player = container.querySelector("video");
  expect(player?.getAttribute("src")).toBe(VIDEO.src);
  expect(player?.getAttribute("poster")).toBe(VIDEO.cover);
  expect(player?.controls).toBe(true);
  expect(player?.autoplay).toBe(true);
  expect(player?.getAttribute("playsinline")).not.toBeNull();
  expect(player?.className).toContain("object-contain");
  expect(container.querySelector("button")).toBeNull();
  // The page link stays under the player.
  expect(screen.getByRole("link").getAttribute("href")).toBe(VIDEO.pageUrl);
});

it("labels the play button without a title, and shows no page link without a page", () => {
  render(
    createElement(DirectVideoEmbed, {
      video: { ...VIDEO, title: null, pageUrl: null, cover: null },
    }),
  );
  expect(
    screen.getByRole("button", { name: m.post_video_play_direct() }),
  ).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
