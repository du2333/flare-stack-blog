// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { PostShareButton } from "./post-share-button";

const share = vi.hoisted(() => vi.fn());
vi.mock("@/lib/share", () => ({ shareLink: share }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shares the post's title and canonical address, without a summary", () => {
  render(
    createElement(PostShareButton, {
      title: "A post",
      url: "https://example.com/post/a-post",
    }),
  );

  fireEvent.click(screen.getByRole("button", { name: m.common_share() }));

  expect(share).toHaveBeenCalledWith({
    title: "A post",
    url: "https://example.com/post/a-post",
  });
});
