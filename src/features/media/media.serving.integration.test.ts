import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyWorkersCachePolicy } from "@/features/cache/workers-cache-policy";
import { handleImageRequest } from "./service/media.service";

/**
 * What /images/{key} answers. In production the image route hands the
 * request to handleImageRequest, and App.fetch runs the Workers cache policy
 * over the response before Workers Caching stores it, so a cached copy
 * replays exactly these headers.
 */
async function serve(
  key: string,
  url: string,
  options: { accept?: string; images?: ImagesBinding } = {},
) {
  const request = new Request(url, {
    headers: { Accept: options.accept ?? "image/webp" },
  });
  const response = await handleImageRequest(
    options.images ? { ...env, IMAGES: options.images } : env,
    key,
    request,
  );
  return applyWorkersCachePolicy(request, response);
}

type ImagesCall = {
  source: string;
  transforms: Array<ImageTransform>;
  output?: ImageOutputOptions;
};

/**
 * An Images binding that records what it was asked to do and answers with
 * `<format> of <source bytes>`, or throws `failure` from `.output()` the way
 * the binding reports a failed transform.
 */
function fakeImages(failure?: Error) {
  const calls: Array<ImagesCall> = [];
  const input = (stream: ReadableStream<Uint8Array>) => {
    const call: ImagesCall = { source: "", transforms: [] };
    calls.push(call);
    const transformer = {
      transform(options: ImageTransform) {
        call.transforms.push(options);
        return transformer;
      },
      async output(options: ImageOutputOptions) {
        call.output = options;
        call.source = await new Response(stream).text();
        if (failure) throw failure;
        return {
          response: () =>
            new Response(`${options.format} of ${call.source}`, {
              headers: { "Content-Type": options.format },
            }),
        };
      },
    };
    return transformer;
  };
  return { images: { input } as unknown as ImagesBinding, calls };
}

function imagesError(code: number, message: string) {
  return Object.assign(
    new Error(`IMAGES_TRANSFORM_ERROR ${code}: ${message}`),
    {
      code,
    },
  );
}

const SCRIPTED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("serving /images/{key}", () => {
  it("serves an SVG as a sandboxed document that cannot run script", async () => {
    await env.R2.put("drawing.svg", SCRIPTED_SVG, {
      httpMetadata: { contentType: "image/svg+xml" },
    });

    const response = await serve(
      "drawing.svg",
      "http://localhost:3000/images/drawing.svg",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toMatch(/(^|;\s*)sandbox(;|$)/);
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/script-src/);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Tag")).toBe("media:drawing.svg");
  });

  it("resizes the R2 original through the Images binding", async () => {
    await env.R2.put("photo.png", "png bytes", {
      httpMetadata: { contentType: "image/png" },
    });
    const stored = await env.R2.head("photo.png");
    const { images, calls } = fakeImages();
    // The binding reads the original itself; nothing goes back to the site.
    const fetchSpy = vi.fn(async () => new Response("unexpected"));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await serve(
      "photo.png",
      "https://blog.example/images/photo.png?quality=80&width=800",
      { images },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(calls).toEqual([
      {
        source: "png bytes",
        transforms: [{ width: 800 }],
        output: { format: "image/webp", quality: 80 },
      },
    ]);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("image/webp of png bytes");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(response.headers.get("ETag")).toBe(`"${stored!.etag}-800-webp"`);
    expect(response.headers.get("Content-Security-Policy")).toMatch(/sandbox/);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Tag")).toBe("media:photo.png");
    // The address outlives a replaced file, so browsers revalidate it.
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  it("prefers AVIF and otherwise keeps the stored format", async () => {
    await env.R2.put("formats.jpg", "jpeg bytes", {
      httpMetadata: { contentType: "image/jpeg" },
    });
    const stored = await env.R2.head("formats.jpg");
    const { images, calls } = fakeImages();
    const url = "https://blog.example/images/formats.jpg?width=400";

    const avif = await serve("formats.jpg", url, {
      accept: "image/avif,image/webp,*/*",
      images,
    });
    const plain = await serve("formats.jpg", url, { accept: "*/*", images });

    expect(calls.map((call) => call.output?.format)).toEqual([
      "image/avif",
      "image/jpeg",
    ]);
    expect(avif.headers.get("ETag")).toBe(`"${stored!.etag}-400-avif"`);
    expect(plain.headers.get("ETag")).toBe(`"${stored!.etag}-400-auto"`);
    expect(plain.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("transforms a replaced file from its new version", async () => {
    const { images, calls } = fakeImages();
    const url = "https://blog.example/images/swap.png?width=800";

    await env.R2.put("swap.png", "first", {
      httpMetadata: { contentType: "image/png" },
    });
    const first = await serve("swap.png", url, { images });
    await env.R2.put("swap.png", "second", {
      httpMetadata: { contentType: "image/png" },
    });
    const second = await serve("swap.png", url, { images });

    expect(calls.map((call) => call.source)).toEqual(["first", "second"]);
    expect(first.headers.get("ETag")).not.toBe(second.headers.get("ETag"));
  });

  it("falls back to the original when the transform fails", async () => {
    await env.R2.put("quota.png", "png bytes", {
      httpMetadata: { contentType: "image/png" },
    });
    const stored = await env.R2.head("quota.png");
    const { images } = fakeImages(imagesError(9422, "usage limit reached"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await serve(
      "quota.png",
      "https://blog.example/images/quota.png?quality=80&width=800",
      { images },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("png bytes");
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("ETag")).toBe(stored!.httpEtag);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(logged).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(logged.mock.calls[0]?.[0]))).toEqual({
      message: "image transform error",
      key: "quota.png",
      error: "IMAGES_TRANSFORM_ERROR 9422: usage limit reached",
    });
  });

  it.each([
    ["an explicit original", "still.png", "?original=true&width=800"],
    ["a width outside the list", "still.png", "?width=799"],
    ["parameters outside the list", "still.png", "?width=800&fit=cover"],
    ["a GIF", "loop.gif", "?width=800"],
    ["an SVG", "drawing.svg", "?width=800"],
  ])("serves %s as stored", async (_case, key, query) => {
    await env.R2.put(key, "stored bytes");
    const { images, calls } = fakeImages();

    const response = await serve(
      key,
      `https://blog.example/images/${key}${query}`,
      { images },
    );

    expect(calls).toEqual([]);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("stored bytes");
    expect(response.headers.get("Vary")).toBeNull();
  });

  it("serves the original in local dev", async () => {
    await env.R2.put("local.png", "png bytes", {
      httpMetadata: { contentType: "image/png" },
    });
    const { images, calls } = fakeImages();

    const response = await serve(
      "local.png",
      "http://localhost:3000/images/local.png?width=800",
      { images },
    );

    expect(calls).toEqual([]);
    expect(await response.text()).toBe("png bytes");
  });
});
