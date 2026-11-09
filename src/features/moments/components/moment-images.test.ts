// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { MomentImages } from "./moment-images";

afterEach(cleanup);

function renderOne(width: number | null, height: number | null) {
  const { container } = render(
    createElement(MomentImages, {
      momentId: 1,
      images: [{ key: "a", url: "a.jpg", width, height }],
    }),
  );
  return container.querySelector("a") as HTMLElement;
}

it("reserves the final box on a single image with known size", () => {
  const link = renderOne(1200, 600);
  expect(link.style.aspectRatio).toBe("1200 / 600");
  expect(link.style.width).toBe("min(100%, 48rem, 1200px)");
});

it("reserves a 4:3 box when the size is unknown", () => {
  const link = renderOne(null, null);
  expect(link.style.aspectRatio).toBe("4 / 3");
  expect(link.style.width).toBe("100%");
});
