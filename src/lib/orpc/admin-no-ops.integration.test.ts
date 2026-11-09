import { env } from "cloudflare:workers";
import { createMockExecutionCtx, seedAdminApiKey } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest } from "@/lib/orpc/openapi-handler";

/**
 * Writes that change nothing leave the post and its saveToken alone, so an
 * open editor does not meet an Edit Conflict it did not cause. Lists of
 * something that does not exist answer 404 instead of an empty list. The
 * admin post search finds a post by what its public page shows.
 */

const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAABcAAAARCAIAAAC5EaDqAAAAHUlEQVR4nGOsCDjBQDFgotyIUVNGTRk1ZdQUrAAAlAUBsqIel+IAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

async function callApi(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
  let body: string | FormData | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

type Written = { id: number; saveToken: string };

async function createPost(
  apiKey: string,
  data: { title: string; contentMarkdown?: string },
) {
  const response = await callApi(apiKey, "/admin/posts", {
    method: "POST",
    body: { data },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as Written;
}

async function readPost(apiKey: string, id: number) {
  const response = await callApi(apiKey, `/admin/posts/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()) as {
    slug: string;
    saveToken: string;
  };
}

function patchPost(
  apiKey: string,
  id: number,
  data: Record<string, unknown>,
  saveToken?: string,
) {
  return callApi(apiKey, `/admin/posts/${id}`, {
    method: "PATCH",
    body: { data, saveToken },
  });
}

async function tokenOf(response: Response) {
  return ((await response.json()) as { saveToken: string }).saveToken;
}

async function publish(apiKey: string, id: number) {
  const response = await callApi(apiKey, `/admin/posts/${id}/publish`, {
    method: "POST",
    body: {},
  });
  expect(response.status).toBe(200);
  return tokenOf(response);
}

async function createTag(apiKey: string, name: string) {
  const response = await callApi(apiKey, "/admin/tags", {
    method: "POST",
    body: { name },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { id: number };
}

function putTags(
  apiKey: string,
  postId: number,
  tagIds: Array<number>,
  saveToken?: string,
) {
  return callApi(apiKey, `/admin/posts/${postId}/tags`, {
    method: "PUT",
    body: { tagIds, saveToken },
  });
}

describe("saving what the post already holds", () => {
  it("keeps the saveToken and writes nothing", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, {
      title: "Same",
      contentMarkdown: "Same body",
    });
    const before = await readPost(apiKey, id);

    const response = await patchPost(
      apiKey,
      id,
      { title: "Same", slug: before.slug },
      saveToken,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      saveToken: string;
      title: string;
    };
    expect(body.title).toBe("Same");
    expect(body.saveToken).toBe(saveToken);
    expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
  });

  it("compares the body whatever order its keys are in", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Body" });
    const first = await patchPost(apiKey, id, {
      contentJson: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        ],
      },
    });
    const saveToken = await tokenOf(first);

    const again = await patchPost(apiKey, id, {
      contentJson: {
        content: [
          { content: [{ text: "Hello", type: "text" }], type: "paragraph" },
        ],
        type: "doc",
      },
    });

    expect(await tokenOf(again)).toBe(saveToken);
  });

  it("compares a date to the whole second", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Dated" });
    const first = await patchPost(apiKey, id, {
      publishedAt: "2026-02-01T08:30:00Z",
    });
    const saveToken = await tokenOf(first);

    const again = await patchPost(apiKey, id, {
      publishedAt: "2026-02-01T08:30:00.400Z",
    });

    expect(await tokenOf(again)).toBe(saveToken);
  });

  it("still replaces the saveToken when a field changes", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Before" });

    const response = await patchPost(apiKey, id, { title: "After" }, saveToken);

    expect(response.status).toBe(200);
    const next = await tokenOf(response);
    expect(next).not.toBe(saveToken);
    expect((await readPost(apiKey, id)).saveToken).toBe(next);
  });

  it("answers 409 to a stale token even when nothing would change", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Guarded" });
    await patchPost(apiKey, id, { title: "Moved on" });
    const current = (await readPost(apiKey, id)).saveToken;

    const response = await patchPost(
      apiKey,
      id,
      { title: "Moved on" },
      saveToken,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "EDIT_CONFLICT",
      data: { saveToken: current },
    });
  });

  it("still answers 404 for a post that does not exist", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await patchPost(apiKey, 987654, { title: "Nobody" });

    expect(response.status).toBe(404);
  });
});

describe("setting the tags a post already has", () => {
  it("keeps the saveToken, in any order and with repeats", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Tagged" });
    const a = await createTag(apiKey, "noop-a");
    const b = await createTag(apiKey, "noop-b");
    const saveToken = await tokenOf(await putTags(apiKey, id, [a.id, b.id]));

    const sameOrder = await putTags(apiKey, id, [a.id, b.id], saveToken);
    const otherOrder = await putTags(apiKey, id, [b.id, a.id, b.id]);

    expect(sameOrder.status).toBe(200);
    expect(await tokenOf(sameOrder)).toBe(saveToken);
    expect(await tokenOf(otherOrder)).toBe(saveToken);
    expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
  });

  it("keeps the saveToken when a post without tags is given none", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Bare" });

    const response = await putTags(apiKey, id, []);

    expect(response.status).toBe(200);
    expect(await tokenOf(response)).toBe(saveToken);
  });

  it("replaces the saveToken when the tags differ", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Tagged" });
    const tag = await createTag(apiKey, "noop-c");

    const response = await putTags(apiKey, id, [tag.id], saveToken);

    expect(response.status).toBe(200);
    expect(await tokenOf(response)).not.toBe(saveToken);
  });

  it("answers 409 to a stale token even when the tags are the same", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Tagged" });
    const tag = await createTag(apiKey, "noop-d");
    const current = await tokenOf(await putTags(apiKey, id, [tag.id]));

    const response = await putTags(apiKey, id, [tag.id], saveToken);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "EDIT_CONFLICT",
      data: { saveToken: current },
    });
  });

  it("answers 404 for a post that does not exist", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await putTags(apiKey, 987654, []);

    expect(response.status).toBe(404);
  });
});

describe("unpublishing", () => {
  it("leaves a draft and its saveToken as they are", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, { title: "Draft" });

    const response = await callApi(apiKey, `/admin/posts/${id}/unpublish`, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, saveToken });
    expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
  });

  it("still replaces the saveToken of a published post", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, {
      title: "Live",
      contentMarkdown: "Body",
    });
    const published = await publish(apiKey, id);

    const response = await callApi(apiKey, `/admin/posts/${id}/unpublish`, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    const next = await tokenOf(response);
    expect(next).not.toBe(published);
    expect((await readPost(apiKey, id)).saveToken).toBe(next);
  });
});

describe("lists of something that does not exist", () => {
  async function codeOf(response: Response) {
    return ((await response.json()) as { code: string }).code;
  }

  it("answers 404 POST_NOT_FOUND for the revisions of a missing post", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts/987654/revisions");

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("POST_NOT_FOUND");
  });

  it("answers an empty list for a post that has no revisions", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Fresh" });

    const response = await callApi(apiKey, `/admin/posts/${id}/revisions`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("answers 404 POST_NOT_FOUND when deleting revisions of a missing post", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts/987654/revisions", {
      method: "DELETE",
      body: { revisionIds: [1] },
    });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("POST_NOT_FOUND");
  });

  it("answers what it deleted for a post that exists", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Fresh" });

    const response = await callApi(apiKey, `/admin/posts/${id}/revisions`, {
      method: "DELETE",
      body: { revisionIds: [987654] },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedIds: [], deletedCount: 0 });
  });

  it("answers 404 POST_NOT_FOUND for the tags of a missing post", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts/987654/tags");

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("POST_NOT_FOUND");
  });

  it("answers an empty list for a post without tags", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Bare" });

    const response = await callApi(apiKey, `/admin/posts/${id}/tags`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("answers 404 MEDIA_NOT_FOUND for the posts of Media that does not exist", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/media/missing.png/posts");

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("MEDIA_NOT_FOUND");
  });

  it("answers an empty list for Media no post uses", async () => {
    const apiKey = await seedAdminApiKey();
    const form = new FormData();
    form.set("image", new File([PNG], "unused.png", { type: "image/png" }));
    const uploaded = await callApi(apiKey, "/admin/media", {
      method: "POST",
      body: form,
    });
    expect(uploaded.status).toBe(200);
    const { key } = (await uploaded.json()) as { key: string };

    const response = await callApi(apiKey, `/admin/media/${key}/posts`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("answers 404 MEDIA_NOT_FOUND for the Moments of Media that does not exist", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/media/missing.png/moments");

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("MEDIA_NOT_FOUND");
  });

  it("answers an empty list for Media no Moment shows", async () => {
    const apiKey = await seedAdminApiKey();
    const form = new FormData();
    form.set("image", new File([PNG], "idle.png", { type: "image/png" }));
    const uploaded = await callApi(apiKey, "/admin/media", {
      method: "POST",
      body: form,
    });
    expect(uploaded.status).toBe(200);
    const { key } = (await uploaded.json()) as { key: string };

    const response = await callApi(apiKey, `/admin/media/${key}/moments`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("admin post search", () => {
  async function search(apiKey: string, term: string) {
    const response = await callApi(
      apiKey,
      `/admin/posts?search=${encodeURIComponent(term)}`,
    );
    expect(response.status).toBe(200);
    const page = (await response.json()) as { items: Array<{ id: number }> };
    return page.items.map((item) => item.id);
  }

  it("finds a published post by the slug and title its public page still has", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, {
      title: "Original Title",
      contentMarkdown: "Body",
    });
    const publicSlug = (await readPost(apiKey, id)).slug;
    await publish(apiKey, id);
    await patchPost(apiKey, id, {
      title: "Reworked Heading",
      slug: "reworked-address",
    });

    expect(await search(apiKey, publicSlug)).toEqual([id]);
    expect(await search(apiKey, "original title")).toEqual([id]);
    expect(await search(apiKey, "Reworked Heading")).toEqual([id]);
    expect(await search(apiKey, "reworked-address")).toEqual([id]);
  });

  it("does not find a draft by a title it never had", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "Only Draft" });
    await patchPost(apiKey, id, { title: "Renamed Draft" });

    expect(await search(apiKey, "Only Draft")).toEqual([]);
    expect(await search(apiKey, "Renamed Draft")).toEqual([id]);
  });

  it("takes a search word of any length and script", async () => {
    const apiKey = await seedAdminApiKey();
    const title = "这是一篇用来测试很长搜索词的文章标题需要超过五十个字节才行";
    const { id } = await createPost(apiKey, { title });

    expect(await search(apiKey, title)).toEqual([id]);
    expect(await search(apiKey, `${title}不存在`)).toEqual([]);
  });

  it("reads % and _ in the search word as themselves", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, { title: "100% pure_water" });
    await createPost(apiKey, { title: "1000 pureXwater" });

    expect(await search(apiKey, "100% pure_water")).toEqual([id]);
    expect(await search(apiKey, "%")).toEqual([id]);
  });
});
