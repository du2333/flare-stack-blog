// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Pagination, pageNumbers } from "./pagination";

afterEach(cleanup);

it("lists every page up to seven", () => {
  expect(pageNumbers(1, 1)).toEqual([1]);
  expect(pageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

it("keeps the first, the last and the current page's neighbours, with gaps between", () => {
  expect(pageNumbers(1, 20)).toEqual([1, 2, 3, 4, "gap", 20]);
  expect(pageNumbers(3, 20)).toEqual([1, 2, 3, 4, "gap", 20]);
  expect(pageNumbers(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  expect(pageNumbers(18, 20)).toEqual([1, "gap", 17, 18, 19, 20]);
  expect(pageNumbers(20, 20)).toEqual([1, "gap", 17, 18, 19, 20]);
  expect(pageNumbers(4, 8)).toEqual([1, "gap", 3, 4, 5, "gap", 8]);
});

it("marks the current page, turns pages, and is not there for one page", () => {
  const onPageChange = vi.fn();
  const props = {
    page: 1,
    totalPages: 3,
    onPageChange,
    label: "Pages",
    previousLabel: "Previous page",
    nextLabel: "Next page",
  };
  render(createElement(Pagination, props));
  expect(screen.getByRole("navigation", { name: "Pages" })).toBeDefined();
  expect(
    screen.getByRole("button", { name: "1" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(
    (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(onPageChange).toHaveBeenLastCalledWith(2);
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  expect(onPageChange).toHaveBeenLastCalledWith(3);
  cleanup();

  render(createElement(Pagination, { ...props, totalPages: 1 }));
  expect(screen.queryByRole("navigation")).toBeNull();
});
