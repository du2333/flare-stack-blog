// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import { shareLink } from "./share";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const data = { title: "A post", url: "https://example.com/post/a" };
const writeText = vi.fn();

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function withShare(
  share: (data: unknown) => Promise<void>,
  canShare?: (data: unknown) => boolean,
) {
  vi.stubGlobal("navigator", { clipboard: { writeText }, share, canShare });
}

it("hands the title and address to the system share sheet", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  withShare(share);

  await shareLink(data);

  expect(share).toHaveBeenCalledWith(data);
  expect(writeText).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

it("copies the address where the browser cannot share", async () => {
  await shareLink(data);

  expect(writeText).toHaveBeenCalledWith(data.url);
  expect(toast.success).toHaveBeenCalledWith(m.common_link_copied());
});

it("copies the address where the browser says it cannot share this data", async () => {
  const share = vi.fn();
  withShare(share, () => false);

  await shareLink(data);

  expect(share).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenCalledWith(data.url);
});

it("copies the address when the share sheet fails", async () => {
  withShare(vi.fn().mockRejectedValue(new DOMException("", "NotAllowedError")));

  await shareLink(data);

  expect(writeText).toHaveBeenCalledWith(data.url);
  expect(toast.success).toHaveBeenCalledWith(m.common_link_copied());
});

it("does nothing when the reader closes the share sheet", async () => {
  withShare(vi.fn().mockRejectedValue(new DOMException("", "AbortError")));

  await shareLink(data);

  expect(writeText).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
});

it("says so when the address cannot be copied either", async () => {
  writeText.mockRejectedValue(new Error("denied"));

  await shareLink(data);

  expect(toast.error).toHaveBeenCalledWith(m.common_link_copy_failed());
  expect(toast.success).not.toHaveBeenCalled();
});
