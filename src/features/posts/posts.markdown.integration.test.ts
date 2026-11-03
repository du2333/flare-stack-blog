import { env } from "cloudflare:workers";
import {
  createMockExecutionCtx,
  createTestContext,
  seedAdminApiKey,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as MediaRepo from "@/features/media/data/media.data";
import { fetchVideoMeta } from "@/features/posts/services/video-meta.service";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * Post content exchanged as Markdown over the Admin HTTP API (ADR 0032), the
 * way an agent or external editor calls it with an API Key.
 */

vi.mock("@/features/posts/services/video-meta.service", () => ({
  fetchVideoMeta: vi.fn(),
}));

const lookUpVideo = vi.mocked(fetchVideoMeta);

const BILIBILI_LINK = "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=90";
const BILIBILI_META = {
  title: "A Bilibili video",
  cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
  duration: 321,
};

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function callAdminApi(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
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

async function createPost(apiKey: string, data: Record<string, unknown>) {
  const response = await callAdminApi(apiKey, "/admin/posts", {
    method: "POST",
    body: { data: { title: "Markdown post", ...data } },
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { id: number }).id;
}

interface ReadPost {
  contentJson?: { content?: Array<{ type: string; attrs?: object }> } | null;
  contentMarkdown?: string | null;
}

async function readPost(apiKey: string, id: number, query = "") {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}${query}`);
  expect(response.status).toBe(200);
  return (await response.json()) as ReadPost;
}

beforeEach(() => {
  lookUpVideo.mockReset();
  lookUpVideo.mockResolvedValue(null);
});

describe("Post content as Markdown over the Admin API", () => {
  it("writes Markdown and reads it back in either format", async () => {
    const apiKey = await seedAdminApiKey();
    const markdown = [
      "## Intro",
      "Some **bold** text and $x^2$.",
      "| A | B |\n| :-- | --: |\n| 1 | 2 |",
      "```mermaid\nflowchart LR\n  A --> B\n```",
      "![cover](/images/cover.png)",
    ].join("\n\n");
    // Media paths must name existing Media.
    await MediaRepo.insertMedia(createTestContext().db, {
      key: "cover.png",
      url: "/images/cover.png",
      fileName: "cover.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });

    const id = await createPost(apiKey, { contentMarkdown: markdown });

    const asJson = await readPost(apiKey, id);
    expect(asJson.contentMarkdown).toBeUndefined();
    expect(asJson.contentJson?.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "table",
      "codeBlock",
      "image",
    ]);

    const asMarkdown = await readPost(apiKey, id, "?contentFormat=markdown");
    expect(asMarkdown).not.toHaveProperty("contentJson");
    expect(asMarkdown.contentMarkdown).toContain("## Intro");
    expect(asMarkdown.contentMarkdown).toContain("$x^2$");
    expect(asMarkdown.contentMarkdown).toContain("```mermaid");
    expect(asMarkdown.contentMarkdown).toContain("![cover](/images/cover.png)");

    // Writing back what was read changes nothing.
    const patch = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentMarkdown: asMarkdown.contentMarkdown } },
    });
    expect(patch.status).toBe(200);
    expect((await readPost(apiKey, id)).contentJson).toEqual(
      asJson.contentJson,
    );
  });

  it("answers a PATCH in the requested content format", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Before") });

    const asMarkdown = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: {
        data: { contentMarkdown: "## Heading\n\nWritten **bold**" },
        contentFormat: "markdown",
      },
    });
    expect(asMarkdown.status).toBe(200);
    const written = (await asMarkdown.json()) as ReadPost & {
      saveToken: string;
    };
    expect(written).not.toHaveProperty("contentJson");
    expect(written.contentMarkdown).toContain("## Heading");
    expect(written.contentMarkdown).toContain("**bold**");
    expect(written.saveToken).toEqual(expect.any(String));

    const asJson = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { title: "Renamed" } },
    });
    expect(asJson.status).toBe(200);
    const plain = (await asJson.json()) as ReadPost;
    expect(plain).not.toHaveProperty("contentMarkdown");
    expect(plain.contentJson?.content?.[0]?.type).toBe("heading");
  });

  it("reads Markdown in the list with includeContent", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Listed") });
    const empty = await createPost(apiKey, { contentJson: null });

    const response = await callAdminApi(
      apiKey,
      "/admin/posts?includeContent=true&contentFormat=markdown&sortBy=id&sortDir=ASC",
    );
    expect(response.status).toBe(200);
    const page = (await response.json()) as {
      items: Array<{ id: number } & ReadPost>;
    };
    const items = new Map(page.items.map((item) => [item.id, item]));
    expect(items.get(id)?.contentMarkdown).toBe("Listed\n");
    expect(items.get(empty)?.contentMarkdown).toBeNull();
    expect(page.items.some((item) => "contentJson" in item)).toBe(false);
  });

  it("keeps JSON reads unchanged without contentFormat", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Plain") });

    const post = await readPost(apiKey, id);
    expect(post.contentJson).toEqual(paragraph("Plain"));
    expect(post).not.toHaveProperty("contentMarkdown");

    const response = await callAdminApi(
      apiKey,
      "/admin/posts?includeContent=true&sortBy=id&sortDir=ASC",
    );
    const page = (await response.json()) as {
      items: Array<{ id: number } & ReadPost>;
    };
    const item = page.items.find((entry) => entry.id === id);
    expect(item?.contentJson).toEqual(paragraph("Plain"));
    expect(item).not.toHaveProperty("contentMarkdown");
  });

  it("reads the published body as Markdown next to the draft, with no revisions left", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, {
      contentMarkdown: "## Live\n\n```ts\nconst a = 1;\n```",
    });
    const unpublished = await readPost(apiKey, id, "?contentFormat=markdown");
    expect(unpublished).toMatchObject({ publicSnapshotContentMarkdown: null });
    expect(unpublished).not.toHaveProperty("publicSnapshotContentJson");

    const published = await callAdminApi(apiKey, `/admin/posts/${id}/publish`, {
      method: "POST",
      body: {},
    });
    expect(published.status).toBe(200);
    await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentMarkdown: "## Draft\n\nChanged." } },
    });
    const revisions = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}/revisions`)
    ).json()) as Array<{ id: number }>;
    expect(revisions.length).toBeGreaterThan(0);
    await callAdminApi(apiKey, `/admin/posts/${id}/revisions`, {
      method: "DELETE",
      body: { revisionIds: revisions.map((revision) => revision.id) },
    });

    const read = (await readPost(
      apiKey,
      id,
      "?contentFormat=markdown",
    )) as ReadPost & { publicSnapshotContentMarkdown?: string | null };
    expect(read.contentMarkdown).toBe("## Draft\n\nChanged.\n");
    // The highlighted code HTML the snapshot keeps does not show.
    expect(read.publicSnapshotContentMarkdown).toBe(
      "## Live\n\n```ts\nconst a = 1;\n```\n",
    );
    expect(read).not.toHaveProperty("publicSnapshotContentJson");

    const asJson = (await readPost(apiKey, id)) as ReadPost & {
      publicSnapshotContentJson?: { content?: Array<{ type: string }> };
    };
    expect(asJson).not.toHaveProperty("publicSnapshotContentMarkdown");
    expect(
      asJson.publicSnapshotContentJson?.content?.map((node) => node.type),
    ).toEqual(["heading", "codeBlock"]);
  });

  it("refuses a local image and names it", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Before") });

    const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: {
        data: {
          contentMarkdown:
            "![ok](https://example.com/a.png)\n\n![local](./photos/b.png)",
        },
      },
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      code: string;
      message: string;
      data: { images: Array<string> };
    };
    expect(body.code).toBe("MARKDOWN_IMAGE_INVALID");
    expect(body.message).toContain("./photos/b.png");
    expect(body.data.images).toEqual(["./photos/b.png"]);
    expect((await readPost(apiKey, id)).contentJson).toEqual(
      paragraph("Before"),
    );

    const create = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: {
        data: { title: "Local", contentMarkdown: "![x](C:/x.png)" },
      },
    });
    expect(create.status).toBe(400);
    expect(((await create.json()) as { code: string }).code).toBe(
      "MARKDOWN_IMAGE_INVALID",
    );
  });

  it("refuses javascript: and data: links in either format and names them", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Before") });
    type LinkError = {
      code: string;
      message: string;
      data: { links: Array<string> };
    };

    const markdown = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: {
        data: {
          contentMarkdown:
            "[ok](https://example.com) [site](/posts) [top](#top) [mail](mailto:a@b.example)\n\n[x](javascript:alert(1)) [y](data:text/html;base64,PHNjcmlwdD4=)\n\n[z][r]\n\n[r]: JAVASCRIPT:alert(2)",
        },
      },
    });
    expect(markdown.status).toBe(400);
    const markdownBody = (await markdown.json()) as LinkError;
    expect(markdownBody.code).toBe("CONTENT_LINK_INVALID");
    expect(markdownBody.data.links).toEqual([
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "JAVASCRIPT:alert(2)",
    ]);
    expect(markdownBody.message).toContain('"javascript:alert(1)"');

    const linked = (href: string) => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "bold" }, { type: "link", attrs: { href } }],
            },
          ],
        },
      ],
    });
    const json = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentJson: linked(" java\tscript:alert(3)") } },
    });
    expect(json.status).toBe(400);
    const jsonBody = (await json.json()) as LinkError;
    expect(jsonBody.code).toBe("CONTENT_LINK_INVALID");
    expect(jsonBody.data.links).toEqual([" java\tscript:alert(3)"]);
    expect((await readPost(apiKey, id)).contentJson).toEqual(
      paragraph("Before"),
    );

    const create = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: {
        data: { title: "Data link", contentJson: linked("data:,hello") },
      },
    });
    expect(create.status).toBe(400);
    expect(((await create.json()) as LinkError).data.links).toEqual([
      "data:,hello",
    ]);

    const fine = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentJson: linked("https://example.com/") } },
    });
    expect(fine.status).toBe(200);
  });

  it("refuses contentJson and contentMarkdown together", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, { contentJson: paragraph("Before") });
    const both = {
      contentJson: paragraph("JSON"),
      contentMarkdown: "Markdown",
    };

    const patch = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: both },
    });
    expect(patch.status).toBe(400);
    expect(((await patch.json()) as { code: string }).code).toBe(
      "CONTENT_FORMAT_AMBIGUOUS",
    );
    expect((await readPost(apiKey, id)).contentJson).toEqual(
      paragraph("Before"),
    );

    const create = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "Both", ...both } },
    });
    expect(create.status).toBe(400);
  });

  it("looks up the title, cover and length of a new video", async () => {
    const apiKey = await seedAdminApiKey();
    lookUpVideo.mockResolvedValue(BILIBILI_META);

    const id = await createPost(apiKey, {
      contentMarkdown: `Watch this:\n\n${BILIBILI_LINK}`,
    });

    expect(lookUpVideo).toHaveBeenCalledWith({
      provider: "bilibili",
      videoId: "BV1fK4y1s7Qf",
      page: 2,
      start: 90,
    });
    const video = (await readPost(apiKey, id)).contentJson?.content?.[1];
    expect(video).toEqual({
      type: "video",
      attrs: {
        provider: "bilibili",
        videoId: "BV1fK4y1s7Qf",
        page: 2,
        start: 90,
        ...BILIBILI_META,
        src: null,
        pageUrl: null,
      },
    });

    // Writing the same video back keeps what it has, without asking again.
    lookUpVideo.mockClear();
    const patch = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentMarkdown: `Again:\n\n${BILIBILI_LINK}` } },
    });
    expect(patch.status).toBe(200);
    expect(lookUpVideo).not.toHaveBeenCalled();
    expect((await readPost(apiKey, id)).contentJson?.content?.[1]).toEqual(
      video,
    );
  });

  it("still writes when the video lookup fails", async () => {
    const apiKey = await seedAdminApiKey();
    lookUpVideo.mockRejectedValue(new Error("provider down"));

    const id = await createPost(apiKey, {
      contentMarkdown: "https://youtu.be/dQw4w9WgXcQ",
    });

    expect((await readPost(apiKey, id)).contentJson?.content).toEqual([
      {
        type: "video",
        attrs: {
          provider: "youtube",
          videoId: "dQw4w9WgXcQ",
          page: null,
          start: null,
          title: null,
          cover: null,
          duration: null,
          src: null,
          pageUrl: null,
        },
      },
    ]);
  });

  describe("Direct Videos", () => {
    const SRC = "https://cdn.example.com/intro.mp4";
    const LINE = `<video src="${SRC}" poster="https://cdn.example.com/intro.jpg" title="Intro &amp; more" data-page="https://example.com/watch/1"></video>`;

    const direct = (attrs: Record<string, unknown>) => ({
      type: "doc",
      content: [
        {
          type: "video",
          attrs: {
            provider: "direct",
            videoId: null,
            page: null,
            start: null,
            title: null,
            cover: null,
            duration: null,
            src: SRC,
            pageUrl: null,
            ...attrs,
          },
        },
      ],
    });

    it("writes a <video> line as a Direct Video, looking nothing up, and reads it back", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, { contentMarkdown: LINE });

      expect(lookUpVideo).not.toHaveBeenCalled();
      expect((await readPost(apiKey, id)).contentJson).toEqual(
        direct({
          title: "Intro & more",
          cover: "https://cdn.example.com/intro.jpg",
          pageUrl: "https://example.com/watch/1",
        }),
      );
      expect(
        (await readPost(apiKey, id, "?contentFormat=markdown")).contentMarkdown,
      ).toBe(`${LINE}\n`);
    });

    it("keeps the length its file had, and takes the title and poster from the Markdown", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, {
        contentJson: direct({
          title: "Old",
          cover: "https://cdn.example.com/old.jpg",
          duration: 95,
        }),
      });

      const patch = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: {
          data: {
            contentMarkdown: `<video src="${SRC}" title="New"></video>\n\n<video src="https://cdn.example.com/other.mp4"></video>`,
          },
        },
      });
      expect(patch.status).toBe(200);
      const content = (await readPost(apiKey, id)).contentJson?.content;
      expect(content?.[0].attrs).toMatchObject({
        src: SRC,
        title: "New",
        cover: null,
        duration: 95,
      });
      expect(content?.[1].attrs).toMatchObject({
        src: "https://cdn.example.com/other.mp4",
        duration: null,
      });
    });

    it("keeps a <video> line whose file is not https as text", async () => {
      const apiKey = await seedAdminApiKey();
      const line = '<video src="http://cdn.example.com/a.mp4"></video>';
      const id = await createPost(apiKey, { contentMarkdown: line });
      expect((await readPost(apiKey, id)).contentJson).toEqual(paragraph(line));
    });

    it("refuses contentJson whose Direct Video addresses are not https, naming them", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, { contentJson: paragraph("Before") });

      const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: {
          data: {
            contentJson: direct({
              src: "http://cdn.example.com/a.mp4",
              cover: "https://cdn.example.com/a.jpg",
              pageUrl: "javascript:alert(1)",
            }),
          },
        },
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        code: string;
        data: { links: Array<string> };
      };
      expect(body.code).toBe("CONTENT_LINK_INVALID");
      expect(body.data.links).toEqual([
        "http://cdn.example.com/a.mp4",
        "javascript:alert(1)",
      ]);
      expect((await readPost(apiKey, id)).contentJson).toEqual(
        paragraph("Before"),
      );

      const fine = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: { data: { contentJson: direct({ duration: 12 }) } },
      });
      expect(fine.status).toBe(200);
    });
  });

  describe("contentJson follows the Markdown rules", () => {
    interface ContentJsonError {
      code: string;
      message: string;
      data: {
        nodeTypes: Array<string>;
        markTypes: Array<string>;
        images: Array<string>;
      };
    }

    const image = (src: string) => ({
      type: "doc",
      content: [{ type: "image", attrs: { src, alt: "x" } }],
    });

    it("refuses javascript: and file: images, on create and on PATCH", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, { contentJson: paragraph("Before") });

      for (const src of ["javascript:alert(1)", "file:///etc/passwd", ""]) {
        const patch = await callAdminApi(apiKey, `/admin/posts/${id}`, {
          method: "PATCH",
          body: { data: { contentJson: image(src) } },
        });
        expect(patch.status).toBe(400);
        const body = (await patch.json()) as ContentJsonError;
        expect(body.code).toBe("CONTENT_JSON_INVALID");
        expect(body.data.images).toEqual([src]);
        if (src) expect(body.message).toContain(src);
      }

      const create = await callAdminApi(apiKey, "/admin/posts", {
        method: "POST",
        body: {
          data: { title: "Bad", contentJson: image("javascript:alert(1)") },
        },
      });
      expect(create.status).toBe(400);

      expect((await readPost(apiKey, id)).contentJson).toEqual(
        paragraph("Before"),
      );
    });

    it("refuses node and mark types the editor does not know, naming them", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, { contentJson: paragraph("Before") });

      const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: {
          data: {
            contentJson: {
              type: "doc",
              content: [
                { type: "callout", content: [{ type: "paragraph" }] },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "x",
                      marks: [{ type: "highlight" }],
                    },
                  ],
                },
              ],
            },
          },
        },
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as ContentJsonError;
      expect(body.code).toBe("CONTENT_JSON_INVALID");
      expect(body.data.nodeTypes).toEqual(["callout"]);
      expect(body.data.markTypes).toEqual(["highlight"]);
      expect(body.message).toContain('"callout"');
      expect(body.message).toContain('"highlight"');
      expect((await readPost(apiKey, id)).contentJson).toEqual(
        paragraph("Before"),
      );
    });

    it("keeps accepting what the editor saves", async () => {
      const apiKey = await seedAdminApiKey();
      const content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Title" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "all marks",
                marks: [
                  { type: "bold" },
                  { type: "underline" },
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ],
          },
          { type: "image", attrs: { src: "/images/a.png?width=10" } },
          { type: "image", attrs: { src: "https://example.com/b.png" } },
        ],
      };
      await MediaRepo.insertMedia(createTestContext().db, {
        key: "a.png",
        url: "/images/a.png",
        fileName: "a.png",
        mimeType: "image/png",
        sizeInBytes: 10,
      });
      const id = await createPost(apiKey, { contentJson: content });

      const markdown = await readPost(apiKey, id, "?contentFormat=markdown");
      expect(markdown.contentMarkdown).toContain("++");
      const written = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: { data: { contentMarkdown: markdown.contentMarkdown } },
      });
      expect(written.status).toBe(200);
    });

    it("reads an empty body as null, as documented", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await createPost(apiKey, {
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      });
      expect(
        (await readPost(apiKey, id, "?contentFormat=markdown")).contentMarkdown,
      ).toBeNull();

      const written = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: { data: { contentMarkdown: "" }, contentFormat: "markdown" },
      });
      expect(written.status).toBe(200);
      expect(((await written.json()) as ReadPost).contentMarkdown).toBeNull();
    });
  });
});
