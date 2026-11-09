// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { m } from "@/paraglide/messages";
import { MomentShareButton } from "./moment-share-button";

const share = vi.hoisted(() => vi.fn());
vi.mock("@/lib/share", () => ({ shareLink: share }));
vi.mock("@/features/config/queries", () => ({
  siteDomainQuery: {
    queryKey: ["site-domain"],
    queryFn: () => "example.com",
    initialData: "example.com",
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function shareMoment(change: Partial<PublicMoment>) {
  const moment: PublicMoment = {
    id: 7,
    text: "",
    images: [],
    video: null,
    postedAt: new Date(0),
    updatedAt: new Date(0),
    commentCount: 0,
    ...change,
  };
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(MomentShareButton, { moment }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: m.common_share() }));
}

it("shares the first 40 characters of the text and the Moment's canonical address", () => {
  shareMoment({ text: "字".repeat(60) });

  expect(share).toHaveBeenCalledWith({
    title: "字".repeat(40),
    url: "https://example.com/moments/7",
  });
});

it("titles a Moment with only images 图片动态", () => {
  shareMoment({
    images: [{ url: "/a.png", width: 1, height: 1 }] as PublicMoment["images"],
  });

  expect(share).toHaveBeenCalledWith({
    title: m.moments_image_only(),
    url: "https://example.com/moments/7",
  });
});

it("titles a Moment with only a video 视频动态", () => {
  shareMoment({ video: { provider: "bilibili" } as PublicMoment["video"] });

  expect(share).toHaveBeenCalledWith({
    title: m.moments_video_only(),
    url: "https://example.com/moments/7",
  });
});

it("shows the label 分享 beside the icon", () => {
  shareMoment({});

  expect(
    screen.getByRole("button", { name: m.common_share() }).textContent,
  ).toBe(m.common_share());
});
