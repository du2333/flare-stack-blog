import { env } from "cloudflare:workers";
import { call } from "@orpc/server";
import { createTestContext } from "tests/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ApiContext } from "@/lib/orpc/context";
import adminRouter from "./server/admin-router";
import * as ConfigService from "./service/config.service";
import { SITE_ICON_SIZES } from "./utils/site-icon";

/**
 * The site icon upload: one square image becomes the four raster icons at
 * their fixed paths, made by the Images binding at upload.
 */

type Transform = { size?: number; format?: string; source: string };

/**
 * An Images binding that reports `size` for every image and answers a
 * transform with `<format> <width> of <source bytes>`, or throws `failure`
 * from `.output()` the way the binding reports a failed transform.
 */
function fakeImages(
  size: { format: string; width: number; height: number },
  failure?: Error,
) {
  const transforms: Array<Transform> = [];
  const images = {
    info: async (stream: ReadableStream<Uint8Array>) => {
      await new Response(stream).arrayBuffer();
      return { ...size, fileSize: 1 };
    },
    input: (stream: ReadableStream<Uint8Array>) => {
      const call: Transform = { source: "" };
      transforms.push(call);
      const transformer = {
        transform(options: ImageTransform) {
          call.size = options.width;
          return transformer;
        },
        async output(options: ImageOutputOptions) {
          call.format = options.format;
          call.source = await new Response(stream).text();
          if (failure) throw failure;
          return {
            response: () =>
              new Response(`${options.format} ${call.size} of ${call.source}`, {
                headers: { "Content-Type": options.format },
              }),
          };
        },
      };
      return transformer;
    },
  };
  return { images: images as unknown as ImagesBinding, transforms };
}

function upload(images: ImagesBinding, file: File) {
  return ConfigService.uploadSiteIcon(
    { env: { ...env, IMAGES: images } },
    { file },
  );
}

async function stored(path: string) {
  const object = await env.R2.get(`asset/${path}`);
  return {
    body: await object?.text(),
    contentType: object?.httpMetadata?.contentType,
  };
}

const square = { format: "image/png", width: 1024, height: 1024 };

describe("uploading the site icon", () => {
  it("makes a PNG of each size from one upload and returns their addresses", async () => {
    const { images, transforms } = fakeImages(square);

    const result = await upload(
      images,
      new File(["icon bytes"], "icon.png", { type: "image/png" }),
    );

    expect(result.error).toBeNull();
    expect(result.data?.resized).toBe(true);
    expect(transforms.map((call) => [call.size, call.format])).toEqual(
      SITE_ICON_SIZES.map((target) => [target.size, "image/png"]),
    );
    // Each transform read the file from the start: a stream per call.
    expect(new Set(transforms.map((call) => call.source))).toEqual(
      new Set(["icon bytes"]),
    );
    for (const target of SITE_ICON_SIZES) {
      expect(await stored(target.path)).toEqual({
        body: `image/png ${target.size} of icon bytes`,
        contentType: "image/png",
      });
      expect(result.data?.icons[target.field]).toMatch(
        new RegExp(`^/images/asset/${target.path}\\?original=true&v=\\d+$`),
      );
    }
  });

  it("stores the original at every size when the transform fails, and says so", async () => {
    const quota = Object.assign(
      new Error("IMAGES_TRANSFORM_ERROR 9422: usage limit reached"),
      { code: 9422 },
    );
    const { images } = fakeImages(
      { format: "image/jpeg", width: 600, height: 600 },
      quota,
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await upload(
      images,
      new File(["jpeg bytes"], "icon.jpg", { type: "image/jpeg" }),
    );

    expect(result.error).toBeNull();
    expect(result.data?.resized).toBe(false);
    for (const target of SITE_ICON_SIZES) {
      expect(await stored(target.path)).toEqual({
        body: "jpeg bytes",
        contentType: "image/jpeg",
      });
      expect(result.data?.icons[target.field]).toMatch(
        `/images/asset/${target.path}?original=true&v=`,
      );
    }
    expect(JSON.parse(String(logged.mock.calls[0]?.[0]))).toEqual({
      message: "site icon transform error",
      error: "IMAGES_TRANSFORM_ERROR 9422: usage limit reached",
    });
  });

  it("refuses an image that is not square or too small and leaves the icons as they were", async () => {
    await env.R2.put("asset/favicon/favicon-96x96.png", "earlier icon");

    for (const [size, reason] of [
      [{ format: "image/png", width: 400, height: 400 }, "SITE_ICON_TOO_SMALL"],
      [
        { format: "image/png", width: 800, height: 600 },
        "SITE_ICON_NOT_SQUARE",
      ],
      [{ format: "image/svg+xml" }, "SITE_ICON_UNSUPPORTED_TYPE"],
    ] as const) {
      const { images, transforms } = fakeImages(size as typeof square);

      const result = await upload(
        images,
        new File(["new bytes"], "icon.png", { type: "image/png" }),
      );

      expect(result.error?.reason).toBe(reason);
      expect(transforms).toEqual([]);
    }
    expect((await stored("favicon/favicon-96x96.png")).body).toBe(
      "earlier icon",
    );
  });

  it("refuses an image the binding cannot read and writes nothing", async () => {
    await env.R2.put("asset/favicon/favicon-96x96.png", "earlier icon");
    const { images, transforms } = fakeImages(square);
    const unreadable = Object.assign(images, {
      info: async () => {
        throw Object.assign(new Error("IMAGES_INFO_ERROR 9412: not an image"), {
          code: 9412,
        });
      },
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await upload(
      unreadable,
      new File(["not an image"], "icon.png", { type: "image/png" }),
    );

    expect(result.error).toEqual({ reason: "SITE_ICON_UNREADABLE" });
    expect(transforms).toEqual([]);
    expect((await stored("favicon/favicon-96x96.png")).body).toBe(
      "earlier icon",
    );
    expect(JSON.parse(String(logged.mock.calls[0]?.[0]))).toEqual({
      message: "site icon info error",
      error: "IMAGES_INFO_ERROR 9412: not an image",
    });
  });

  it("answers a failed write as a failed upload, logged", async () => {
    const { images } = fakeImages(square);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingR2 = {
      put: async () => {
        throw new Error("R2 put failed");
      },
    } as unknown as R2Bucket;

    const result = await ConfigService.uploadSiteIcon(
      { env: { ...env, IMAGES: images, R2: failingR2 } },
      { file: new File(["icon bytes"], "icon.png", { type: "image/png" }) },
    );

    expect(result.error).toEqual({ reason: "SITE_ICON_STORE_FAILED" });
    expect(JSON.parse(String(logged.mock.calls[0]?.[0]))).toEqual({
      message: "site icon store error",
      error: "R2 put failed",
    });
  });
});

/** A request from someone with this role (null: signed out). */
function contextOf(role: "admin" | "user" | null, images: ImagesBinding) {
  const test = createTestContext();
  return {
    ...test,
    env: { ...test.env, IMAGES: images },
    headers: new Headers(),
    getAuth: async () =>
      ({
        api: {
          getSession: async () =>
            role ? { user: { id: "someone", role } } : null,
        },
      }) as never,
  } satisfies ApiContext;
}

describe("the site icon procedure", () => {
  const file = () =>
    new File(["icon bytes"], "icon.png", { type: "image/png" });

  it("is for the Admin only", async () => {
    const { images, transforms } = fakeImages(square);

    await expect(
      call(
        adminRouter.uploadIcon,
        { file: file() },
        {
          context: contextOf(null, images),
        },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      call(
        adminRouter.uploadIcon,
        { file: file() },
        {
          context: contextOf("user", images),
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(transforms).toEqual([]);

    await expect(
      call(
        adminRouter.uploadIcon,
        { file: file() },
        {
          context: contextOf("admin", images),
        },
      ),
    ).resolves.toMatchObject({ resized: true });
  });

  it("answers a refused image with the reason and its size", async () => {
    const { images } = fakeImages({
      format: "image/png",
      width: 800,
      height: 600,
    });

    await expect(
      call(
        adminRouter.uploadIcon,
        { file: file() },
        {
          context: contextOf("admin", images),
        },
      ),
    ).rejects.toMatchObject({
      code: "SITE_ICON_INVALID",
      data: { detail: "NOT_SQUARE", width: 800, height: 600 },
    });
  });

  it("answers a failed write with its own error", async () => {
    const { images } = fakeImages(square);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const context = contextOf("admin", images);
    context.env = {
      ...context.env,
      R2: {
        put: async () => {
          throw new Error("R2 put failed");
        },
      } as unknown as R2Bucket,
    };

    await expect(
      call(adminRouter.uploadIcon, { file: file() }, { context }),
    ).rejects.toMatchObject({ code: "SITE_ICON_STORE_FAILED", status: 500 });
  });
});
