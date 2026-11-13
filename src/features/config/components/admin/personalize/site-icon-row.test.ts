// @vitest-environment jsdom
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, expect, it, vi } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { orpcClient } from "@/lib/orpc";
import { toast } from "@/lib/toast";
import { m } from "@/paraglide/messages";
import { SiteIconRow } from "./site-icon-row";

vi.mock("@/lib/orpc", () => {
  const uploadIcon = vi.fn();
  return {
    orpcClient: { config: { admin: { uploadAsset: vi.fn(), uploadIcon } } },
    // The query utilities call the client with the mutation's input.
    orpc: {
      config: {
        admin: {
          uploadIcon: {
            mutationOptions: (options: object) => ({
              mutationFn: (input: { file: File }) => uploadIcon(input),
              ...options,
            }),
          },
        },
      },
    },
  };
});
vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.mocked(orpcClient.config.admin.uploadIcon).mockReset();
});

const saved = {
  faviconSvg: "",
  favicon96: "/images/asset/favicon/favicon-96x96.png?original=true&v=1",
  appleTouchIcon:
    "/images/asset/favicon/apple-touch-icon.png?original=true&v=1",
  webApp192:
    "/images/asset/favicon/web-app-manifest-192x192.png?original=true&v=1",
  webApp512:
    "/images/asset/favicon/web-app-manifest-512x512.png?original=true&v=1",
};
const uploaded = {
  favicon96: "/images/asset/favicon/favicon-96x96.png?original=true&v=2",
  appleTouchIcon:
    "/images/asset/favicon/apple-touch-icon.png?original=true&v=2",
  webApp192:
    "/images/asset/favicon/web-app-manifest-192x192.png?original=true&v=2",
  webApp512:
    "/images/asset/favicon/web-app-manifest-512x512.png?original=true&v=2",
};

function renderRow(icons: Partial<typeof saved> = saved) {
  const form: { current?: UseFormReturn<SystemConfig> } = {};
  function Harness({ children }: { children: ReactNode }) {
    const config = structuredClone(DEFAULT_CONFIG);
    config.site = { ...config.site, icons };
    const methods = useForm<SystemConfig>({ defaultValues: config });
    form.current = methods;
    return createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(FormProvider<SystemConfig>, { ...methods, children }),
    );
  }
  render(createElement(Harness, null, createElement(SiteIconRow)));
  return () => form.current!.getValues("site.icons");
}

async function chooseRaster(file = new File(["png"], "icon.png")) {
  const input = document.querySelector<HTMLInputElement>(
    'input[type="file"][accept*=".png"]',
  );
  if (!input) throw new Error("no raster upload");
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

it("offers one raster upload and an optional SVG, and shows the defaults with neither", () => {
  renderRow({});
  const inputs =
    document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  expect(Array.from(inputs, (input) => input.accept)).toEqual([
    ".png,.jpg,.jpeg,image/png,image/jpeg",
    ".svg,image/svg+xml",
  ]);
  const previews = Array.from(
    document.querySelectorAll<HTMLImageElement>(".site-icon-preview img"),
    (image) => image.getAttribute("src"),
  );
  expect(previews).toEqual(["/favicon-96x96.png", "/favicon.svg"]);
  expect(
    screen.queryAllByRole("button", { name: m.personalize_site_icon_remove() }),
  ).toEqual([]);
});

it("puts the four addresses of one upload into the form", async () => {
  vi.mocked(orpcClient.config.admin.uploadIcon).mockResolvedValue({
    icons: uploaded,
    resized: true,
  });
  const icons = renderRow();

  await chooseRaster();

  expect(icons()).toEqual({ ...saved, ...uploaded });
  expect(screen.queryByRole("status")).toBeNull();
});

it("says so at the control when the sizes could not be made", async () => {
  vi.mocked(orpcClient.config.admin.uploadIcon).mockResolvedValue({
    icons: uploaded,
    resized: false,
  });
  const icons = renderRow();

  await chooseRaster();

  expect(icons()).toEqual({ ...saved, ...uploaded });
  expect(screen.getByRole("status").textContent).toBe(
    m.personalize_site_icon_not_resized(),
  );
});

it("shows why an image is refused and keeps the icons as they were", async () => {
  vi.mocked(orpcClient.config.admin.uploadIcon).mockRejectedValue(
    new ORPCError("SITE_ICON_INVALID", {
      defined: true,
      status: 400,
      data: { detail: "TOO_SMALL", width: 400, height: 400 },
    }),
  );
  const icons = renderRow();

  await chooseRaster();

  expect(icons()).toEqual(saved);
  expect(screen.getByRole("alert").textContent).toBe(
    m.personalize_site_icon_too_small({ width: 400, height: 400, min: 512 }),
  );
});

/** The 移除 of the raster row or of the SVG row. */
function removeButton(row: "raster" | "svg") {
  const button = screen
    .getAllByRole("button", { name: m.personalize_site_icon_remove() })
    .find(
      (element) =>
        element.getAttribute("aria-describedby") === `site-icon-${row}-name`,
    );
  if (!button) throw new Error(`no 移除 for ${row}`);
  return button;
}

const svg = "/images/asset/favicon/favicon.svg?original=true&v=1";

it("removes an uploaded SVG, leaving the raster icon for tabs", () => {
  const icons = renderRow({ ...saved, faviconSvg: svg });

  fireEvent.click(removeButton("svg"));

  expect(icons()?.faviconSvg).toBe("");
  expect(document.querySelectorAll(".site-icon-preview img").length).toBe(1);
});

it("removes the uploaded raster icon, so the default icons apply again", () => {
  const icons = renderRow({ ...saved, faviconSvg: svg });

  fireEvent.click(removeButton("raster"));

  expect(icons()).toEqual({
    faviconSvg: svg,
    favicon96: "",
    appleTouchIcon: "",
    webApp192: "",
    webApp512: "",
  });
  expect(
    document.querySelector(".site-icon-preview img")?.getAttribute("src"),
  ).toBe("/favicon-96x96.png");
  // Only the SVG is left to remove.
  expect(
    screen.getAllByRole("button", { name: m.personalize_site_icon_remove() }),
  ).toHaveLength(1);
});

it("reports a failed store as a failed upload and keeps the icons", async () => {
  vi.mocked(orpcClient.config.admin.uploadIcon).mockRejectedValue(
    new ORPCError("SITE_ICON_STORE_FAILED", { defined: true, status: 500 }),
  );
  const icons = renderRow();

  await chooseRaster();

  expect(icons()).toEqual(saved);
  expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
    m.settings_asset_upload_fail(),
    expect.anything(),
  );
});
