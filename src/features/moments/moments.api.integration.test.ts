import { env } from "cloudflare:workers";
import { createMockExecutionCtx, seedAdminApiKey } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import * as MediaRepo from "@/features/media/data/media.data";
import { getDb } from "@/lib/db";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * Moments over the HTTP API, the way the Moments page and the Agent Skill
 * call it: Admin writes with an API Key, public reads with none.
 */

type AdminMoment = {
  id: number;
  text: string;
  images: Array<{ key: string; url: string }>;
  video: Record<string, unknown> | null;
  postedAt: string;
  saveToken: string;
};

async function call(
  path: string,
  init: { method?: string; body?: unknown; apiKey?: string } = {},
) {
  const headers = new Headers();
  if (init.apiKey) headers.set("x-api-key", init.apiKey);
  let body: string | undefined;
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context: createApiContext(request.headers, env, createMockExecutionCtx()),
  });
  if (!response) throw new Error(`No route matched ${request.method} ${path}`);
  return response;
}

async function postMoment(apiKey: string, body: unknown) {
  const response = await call("/admin/moments", {
    method: "POST",
    body,
    apiKey,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as AdminMoment;
}

function patchMoment(
  apiKey: string,
  id: number,
  data: Record<string, unknown>,
  saveToken?: string,
) {
  return call(`/admin/moments/${id}`, {
    method: "PATCH",
    body: { data, saveToken },
    apiKey,
  });
}

describe("Admin Moments with an API Key", () => {
  it("posts, reads, edits and deletes a Moment", async () => {
    const apiKey = await seedAdminApiKey();
    await MediaRepo.insertMedia(getDb(env), {
      key: "api.png",
      url: "/images/api.png",
      fileName: "api.png",
      mimeType: "image/png",
      sizeInBytes: 1,
    });

    const created = await postMoment(apiKey, {
      text: "hello",
      images: ["/images/api.png"],
    });
    expect(created).toMatchObject({
      text: "hello",
      images: [{ key: "api.png", url: "/images/api.png" }],
      video: null,
    });
    expect(typeof created.saveToken).toBe("string");

    const read = await call(`/admin/moments/${created.id}`, { apiKey });
    expect(read.status).toBe(200);
    expect(((await read.json()) as AdminMoment).saveToken).toBe(
      created.saveToken,
    );

    const edited = await patchMoment(
      apiKey,
      created.id,
      { text: "hello again" },
      created.saveToken,
    );
    expect(edited.status).toBe(200);
    const saved = (await edited.json()) as AdminMoment;
    expect(saved.text).toBe("hello again");
    expect(saved.postedAt).toBe(created.postedAt);

    const removed = await call(`/admin/moments/${created.id}`, {
      method: "DELETE",
      apiKey,
    });
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ success: true });
    const gone = await call(`/admin/moments/${created.id}`, { apiKey });
    expect(gone.status).toBe(404);
    expect(((await gone.json()) as { code: string }).code).toBe(
      "MOMENT_NOT_FOUND",
    );
  });

  it("refuses writes without one", async () => {
    const response = await call("/admin/moments", {
      method: "POST",
      body: { text: "anonymous" },
    });
    expect(response.status).toBe(401);
  });

  it("refuses a save after someone else's with the Edit Conflict Posts answer", async () => {
    const apiKey = await seedAdminApiKey();
    const created = await postMoment(apiKey, { text: "first" });
    const other = (await (
      await patchMoment(apiKey, created.id, { text: "other" })
    ).json()) as AdminMoment;

    const response = await patchMoment(
      apiKey,
      created.id,
      { text: "mine" },
      created.saveToken,
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code: string;
      data: { saveToken: string };
    };
    expect(body.code).toBe("EDIT_CONFLICT");
    expect(body.data.saveToken).toBe(other.saveToken);
  });

  it("answers what a Moment cannot hold with its own code and details", async () => {
    const apiKey = await seedAdminApiKey();

    const empty = await call("/admin/moments", {
      method: "POST",
      body: {},
      apiKey,
    });
    expect(empty.status).toBe(400);
    expect(((await empty.json()) as { code: string }).code).toBe(
      "MOMENT_EMPTY",
    );

    const long = await call("/admin/moments", {
      method: "POST",
      body: { text: "x".repeat(1001) },
      apiKey,
    });
    expect(long.status).toBe(400);
    expect(await long.json()).toMatchObject({
      code: "MOMENT_TEXT_TOO_LONG",
      data: { limit: 1000, length: 1001 },
    });

    const video = await call("/admin/moments", {
      method: "POST",
      body: { video: { src: "http://video.example/clip.mp4" } },
      apiKey,
    });
    expect(video.status).toBe(400);
    expect(await video.json()).toMatchObject({
      code: "MOMENT_VIDEO_INVALID",
      data: { detail: "NOT_HTTPS" },
    });

    for (const duration of [0, -3, 1.5, "95"]) {
      const badLength = await call("/admin/moments", {
        method: "POST",
        body: { video: { src: "https://video.example/clip.mp4", duration } },
        apiKey,
      });
      expect(badLength.status, String(duration)).toBe(400);
    }
    const measured = await postMoment(apiKey, {
      video: { src: "https://video.example/clip.mp4", duration: 95 },
    });
    expect(measured.video).toMatchObject({ provider: "direct", duration: 95 });

    const unknownField = await call("/admin/moments", {
      method: "POST",
      body: { text: "x", title: "no titles" },
      apiKey,
    });
    expect(unknownField.status).toBe(400);

    const nothingToChange = await patchMoment(
      apiKey,
      (await postMoment(apiKey, { text: "kept" })).id,
      {},
    );
    expect(nothingToChange.status).toBe(400);
  });
});

describe("public Moments", () => {
  it("lists, reads and tells whether Moments exist, without a key", async () => {
    const before = await call("/moments/exists");
    expect(await before.json()).toEqual({ exists: false });

    const apiKey = await seedAdminApiKey();
    const first = await postMoment(apiKey, { text: "one" });
    await postMoment(apiKey, { text: "two" });

    const list = await call("/moments?page=1");
    expect(list.status).toBe(200);
    const page = (await list.json()) as {
      items: Array<Record<string, unknown>>;
      page: number;
      totalPages: number;
    };
    expect(page.items.map((item) => item.text)).toEqual(["two", "one"]);
    expect(page).toMatchObject({ page: 1, totalPages: 1 });
    expect(page.items[0]).not.toHaveProperty("saveToken");

    const latest = await call("/moments/latest");
    expect(
      ((await latest.json()) as Array<{ text: string }>).map((m) => m.text),
    ).toEqual(["two", "one"]);

    const one = await call(`/moments/${first.id}`);
    expect(one.status).toBe(200);
    expect(((await one.json()) as { text: string }).text).toBe("one");

    const missing = await call(`/moments/${first.id + 100}`);
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { code: string }).code).toBe(
      "MOMENT_NOT_FOUND",
    );

    expect(await (await call("/moments/exists")).json()).toEqual({
      exists: true,
    });
  });
});

describe("Moments that show a Media", () => {
  it("lists them newest first, titled by their text, and refuses deleting the image", async () => {
    const apiKey = await seedAdminApiKey();
    for (const key of ["shown.png", "other.png"]) {
      await MediaRepo.insertMedia(getDb(env), {
        key,
        url: `/images/${key}`,
        fileName: key,
        mimeType: "image/png",
        sizeInBytes: 1,
      });
    }
    const older = await postMoment(apiKey, {
      text: "  first\n\nwords  ",
      images: ["/images/shown.png", "/images/shown.png"],
    });
    const wordless = await postMoment(apiKey, {
      images: ["/images/shown.png"],
    });
    await postMoment(apiKey, {
      text: "elsewhere",
      images: ["/images/other.png"],
    });

    const response = await call("/admin/media/shown.png/moments", { apiKey });
    expect(response.status).toBe(200);
    const listed = (await response.json()) as Array<{
      id: number;
      title: string;
      postedAt: string;
    }>;
    expect(listed.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: wordless.id, title: "图片动态" },
      { id: older.id, title: "first words" },
    ]);
    expect(listed[1].postedAt).toBe(older.postedAt);

    const refused = await call("/admin/media/shown.png", {
      method: "DELETE",
      apiKey,
    });
    expect(refused.status).toBe(409);
    expect(((await refused.json()) as { code: string }).code).toBe(
      "MEDIA_IN_USE",
    );

    for (const moment of [older, wordless]) {
      await call(`/admin/moments/${moment.id}`, { method: "DELETE", apiKey });
    }
    const after = await call("/admin/media/shown.png/moments", { apiKey });
    expect(await after.json()).toEqual([]);
  });
});
