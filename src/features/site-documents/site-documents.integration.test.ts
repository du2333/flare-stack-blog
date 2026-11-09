import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  createTestContext,
  seedAdminApiKey,
} from "tests/test-utils";
import {
  childNamed,
  childrenNamed,
  parseXml,
  unescapeBasicHtml,
} from "tests/xml";
import { describe, expect, it } from "vitest";
import * as CategoryService from "@/features/categories/categories.service";
import * as MediaRepo from "@/features/media/data/media.data";
import * as MomentRepo from "@/features/moments/data/moments.data";
import * as PostService from "@/features/posts/services/posts.service";
import * as TagService from "@/features/tags/tags.service";
import { withoutXmlForbiddenCharacters } from "@/features/posts/utils/feed-xml";
import { unwrap } from "@/lib/errors";
import {
  buildAtomXml,
  buildFeedJson,
  buildMomentsAtomXml,
  buildMomentsFeedJson,
  buildMomentsRssXml,
  buildSitemapXml,
  buildRssXml,
} from "@/features/site-documents/service/site-documents.service";
import { MomentsTable, PostsTable } from "@/lib/db/schema";
import { baseLocale, overwriteGetLocale } from "@/paraglide/runtime";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * The public documents built from published posts and Moments: the sitemap and
 * the feeds.
 */

async function callAdminApi(
  apiKey: string,
  path: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
) {
  const headers = new Headers({
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  });
  const request = new Request(`http://localhost:3000/api${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context: createApiContext(request.headers, env, createMockExecutionCtx()),
  });
  if (!response) throw new Error(`No route matched ${method} ${path}`);
  expect(response.status).toBe(200);
  return (await response.json()) as { id: number };
}

async function publishedPost(title: string, contentMarkdown: string) {
  const apiKey = await seedAdminApiKey();
  const { id } = await callAdminApi(apiKey, "/admin/posts", {
    data: { title, contentMarkdown },
  });
  await callAdminApi(apiKey, `/admin/posts/${id}/publish`, {});
  return { apiKey, id };
}

async function findPost(id: number) {
  const { db } = createTestContext();
  const post = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.id, id),
  });
  if (!post) throw new Error("Expected the post");
  return { db, post };
}

const lastmodOf = (sitemap: string, slug: string) =>
  new RegExp(
    `<loc>[^<]*/post/${slug}</loc>\\s*<lastmod>([^<]+)</lastmod>`,
  ).exec(sitemap)?.[1];

describe("sitemap", () => {
  it("dates a post by its last publication, not by edits to the draft", async () => {
    const { apiKey, id } = await publishedPost(
      "Sitemap dated post",
      "Published body",
    );
    const { db, post } = await findPost(id);
    const lastPublishedAt = post.publicSnapshotJson?.lastPublishedAt;
    expect(lastPublishedAt).toEqual(expect.any(String));

    // A later edit that nobody published moves the draft's updatedAt.
    await callAdminApi(
      apiKey,
      `/admin/posts/${id}`,
      { data: { contentMarkdown: "An unpublished edit" } },
      "PATCH",
    );
    await db
      .update(PostsTable)
      .set({ updatedAt: new Date("2030-01-01T00:00:00.000Z") })
      .where(eq(PostsTable.id, id));

    const sitemap = await buildSitemapXml(env);
    expect(lastmodOf(sitemap, post.publicSlug ?? "")).toBe(lastPublishedAt);
    expect(sitemap).not.toContain("2030-01-01");
  });

  it("falls back to the publication date for a snapshot without lastPublishedAt", async () => {
    const { id } = await publishedPost("Older snapshot", "Body");
    const { db, post } = await findPost(id);
    if (!post.publicSnapshotJson) throw new Error("Expected a snapshot");
    const { lastPublishedAt: _removed, ...older } = post.publicSnapshotJson;
    await db
      .update(PostsTable)
      .set({
        publicSnapshotJson: {
          ...older,
          publishedAt: "2026-01-02T03:04:05.000Z",
        },
      })
      .where(eq(PostsTable.id, id));

    const sitemap = await buildSitemapXml(env);
    expect(lastmodOf(sitemap, post.publicSlug ?? "")).toBe(
      "2026-01-02T03:04:05.000Z",
    );
  });
});

describe("feeds", () => {
  it("carry the post body as HTML in JSON Feed, RSS and Atom", async () => {
    await MediaRepo.insertMedia(createTestContext().db, {
      key: "pic.png",
      url: "/images/pic.png",
      fileName: "pic.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    await publishedPost(
      "Feed HTML post",
      "Some **bold** text\n\n![pic](/images/pic.png)\n\n- item",
    );
    const executionCtx = createMockExecutionCtx();

    const json = JSON.parse(await buildFeedJson(env, executionCtx)) as {
      items: Array<{ title: string; content_html?: string }>;
    };
    const item = json.items.find((entry) => entry.title === "Feed HTML post");
    expect(item?.content_html).toContain("<strong>bold</strong>");
    expect(item?.content_html).toContain("<li>");
    expect(item?.content_html).toMatch(
      /<img src="https:\/\/[^"]+\/images\/pic\.png"/,
    );

    const rss = await buildRssXml(env, executionCtx);
    expect(rss).toContain("<strong>bold</strong>");
    const atom = await buildAtomXml(env, executionCtx);
    expect(atom).toContain("<strong>bold</strong>");
  });
});

/**
 * One published post can make RSS and Atom unreadable for the whole site, so
 * the feeds must be well-formed XML 1.0 for anything a snapshot holds, and
 * every plain-text field must read back as written.
 */
describe("feed XML", () => {
  // Characters XML 1.0 forbids, markup, `&amp;` as typed, and `]]>` several
  // times over.
  const TITLE =
    'T\u0000i\u000Btle <T> & "q" &amp; ]]> ]]> ]]>\uFFFE 👩\u200D💻';
  const SUMMARY =
    "\u000Bsum\u001B[31m <b>bold</b> & ]]> ]]>\u0007\nsecond line \uFFFF";
  const CODE = '\u001B[31mred\u001B[0m ]]> ]]> a<b && c>d "q" ]]>\u0000';
  const BODY = 'Body <T> & "q" ]]> \u000B]]> \u001F ]]>';

  async function publishNastyPost() {
    const admin = createAdminTestContext();
    const category = unwrap(
      await CategoryService.createCategory(admin, {
        name: 'Cat <T> & "q" ]]> ]]>\uFFFE',
      }),
    );
    const tag = unwrap(
      await TagService.createTag(admin, { name: "Tag ]]> ]]> <T> & \uFFFF" }),
    );
    const { id } = await PostService.createEmptyPost(admin);
    unwrap(
      await PostService.updatePost(admin, {
        id,
        data: { title: "Nasty feed post", categoryId: category.id },
      }),
    );
    unwrap(
      await TagService.setPostTags(admin, { postId: id, tagIds: [tag.id] }),
    );
    unwrap(await PostService.publishPost(admin, { id }));

    // Posts stored before titles and summaries refused control characters, and
    // a body is never refused them, so the snapshot is written as stored.
    const { db, post } = await findPost(id);
    if (!post.publicSnapshotJson) throw new Error("Expected a snapshot");
    await db
      .update(PostsTable)
      .set({
        publicSnapshotJson: {
          ...post.publicSnapshotJson,
          title: TITLE,
          summary: SUMMARY,
          contentJson: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: BODY }] },
              {
                type: "codeBlock",
                attrs: { language: null },
                content: [{ type: "text", text: CODE }],
              },
            ],
          },
        },
      })
      .where(eq(PostsTable.id, id));
    return id;
  }

  const strip = withoutXmlForbiddenCharacters;

  it("keeps RSS well-formed and reads titles, summaries and bodies back as written", async () => {
    await publishNastyPost();

    const root = parseXml(await buildRssXml(env, createMockExecutionCtx()));
    expect(root.name).toBe("rss");
    const item = childNamed(childNamed(root, "channel"), "item");

    // No text escaped the CDATA into an element of its own.
    expect(item.children.map((child) => child.name)).toEqual([
      "title",
      "link",
      "guid",
      "pubDate",
      "description",
      "content:encoded",
      "author",
    ]);
    // The title is plain text; the description is HTML.
    expect(childNamed(item, "title").text).toBe(strip(TITLE));
    expect(unescapeBasicHtml(childNamed(item, "description").text)).toBe(
      strip(SUMMARY),
    );
    const content = childNamed(item, "content:encoded").text;
    expect(content).toContain("&lt;T&gt;");
    expect(content).not.toContain("<T>");
    expect(content.split("]]").length).toBeGreaterThan(5);
    expect(content).toContain("[31mred");
    expect(withoutXmlForbiddenCharacters(content)).toBe(content);
  });

  it("keeps Atom well-formed and reads titles, summaries and bodies back as written", async () => {
    await publishNastyPost();

    const root = parseXml(await buildAtomXml(env, createMockExecutionCtx()));
    expect(root.name).toBe("feed");
    const entries = childrenNamed(root, "entry");
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    if (!entry) throw new Error("Expected an entry");

    expect(entry.children.map((child) => child.name)).toEqual([
      "title",
      "id",
      "link",
      "updated",
      "summary",
      "content",
      "author",
      "published",
    ]);
    // Title and summary are HTML in Atom, so plain text arrives escaped.
    const title = childNamed(entry, "title");
    expect(title.attributes.type).toBe("html");
    expect(unescapeBasicHtml(title.text)).toBe(strip(TITLE));
    expect(unescapeBasicHtml(childNamed(entry, "summary").text)).toBe(
      strip(SUMMARY),
    );
    const content = childNamed(entry, "content").text;
    expect(content).toContain("&lt;T&gt;");
    expect(content).not.toContain("<T>");
    expect(content.split("]]").length).toBeGreaterThan(5);
  });

  it("leaves JSON Feed with the title and summary as stored", async () => {
    const id = await publishNastyPost();

    const json = JSON.parse(
      await buildFeedJson(env, createMockExecutionCtx()),
    ) as {
      items: Array<{ id: string; title: string; summary?: string }>;
    };
    const item = json.items.find((entry) => entry.id === String(id));
    expect(item?.title).toBe(TITLE);
    expect(item?.summary).toBe(SUMMARY);
  });

  it("leaves no forbidden character or marker in either document", async () => {
    await publishNastyPost();

    for (const document of [
      await buildRssXml(env, createMockExecutionCtx()),
      await buildAtomXml(env, createMockExecutionCtx()),
    ]) {
      expect(() => parseXml(document)).not.toThrow();
      expect(withoutXmlForbiddenCharacters(document)).toBe(document);
      expect(document).not.toContain("\u0000");
    }
  });
});

/**
 * Moments in the sitemap and in their own three feeds, which carry what the
 * public page shows with no site around it.
 */
describe("Moments", () => {
  const POSTED_AT = new Date("2026-03-04T05:06:07.000Z");
  const EDITED_AT = new Date("2026-03-05T08:09:10.000Z");

  async function postMoment(
    data: {
      text?: string;
      video?: NonNullable<
        Parameters<typeof MomentRepo.insertMoment>[1]["video"]
      >;
      images?: Array<string>;
    },
    dates: { postedAt?: Date; updatedAt?: Date } = {},
  ) {
    const { db } = createTestContext();
    const mediaIds: Array<number> = [];
    for (const key of data.images ?? []) {
      const media = await MediaRepo.insertMedia(db, {
        key,
        url: `/images/${key}`,
        fileName: key,
        mimeType: "image/png",
        sizeInBytes: 10,
      });
      mediaIds.push(media.id);
    }
    const id = await MomentRepo.insertMoment(db, {
      text: data.text ?? "",
      video: data.video ?? null,
      mediaIds,
    });
    await db
      .update(MomentsTable)
      .set({
        postedAt: dates.postedAt ?? POSTED_AT,
        updatedAt: dates.updatedAt ?? dates.postedAt ?? POSTED_AT,
      })
      .where(eq(MomentsTable.id, id));
    return id;
  }

  const bilibili = {
    provider: "bilibili",
    videoId: "BV1fK4y1s7Qf",
    page: 2,
    start: 90,
    title: "A Bilibili video",
    cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
    duration: 321,
    src: null,
    pageUrl: null,
  } as const;

  const direct = {
    provider: "direct",
    videoId: null,
    page: null,
    start: null,
    title: "A clip",
    cover: "https://video.example/poster.jpg",
    duration: null,
    src: "https://video.example/clip.mp4",
    pageUrl: null,
  } as const;

  type JsonItem = {
    id: string;
    url: string;
    title: string;
    content_html: string;
    date_published: string;
    date_modified: string;
  };

  async function jsonItems() {
    const json = JSON.parse(
      await buildMomentsFeedJson(env, createMockExecutionCtx()),
    ) as { items: Array<JsonItem> };
    return json.items;
  }

  describe("in the sitemap", () => {
    it("lists /moments only once a Moment exists, and each Moment with its last write", async () => {
      expect(await buildSitemapXml(env)).not.toContain("/moments");

      const first = await postMoment({ text: "one" });
      const second = await postMoment(
        { text: "two" },
        { postedAt: POSTED_AT, updatedAt: EDITED_AT },
      );

      const sitemap = await buildSitemapXml(env);
      expect(() => parseXml(sitemap)).not.toThrow();
      expect(sitemap).toMatch(/<loc>https:\/\/[^<]+\/moments<\/loc>/);
      const lastmod = (id: number) =>
        new RegExp(
          `<loc>[^<]*/moments/${id}</loc>\\s*<lastmod>([^<]+)</lastmod>`,
        ).exec(sitemap)?.[1];
      expect(lastmod(first)).toBe(POSTED_AT.toISOString());
      expect(lastmod(second)).toBe(EDITED_AT.toISOString());
    });
  });

  describe("in the feeds", () => {
    it("are empty feeds with no Moment", async () => {
      expect(await jsonItems()).toEqual([]);
      const root = parseXml(
        await buildMomentsRssXml(env, createMockExecutionCtx()),
      );
      expect(childrenNamed(childNamed(root, "channel"), "item")).toEqual([]);
    });

    it("give a Moment with text its first 40 characters as the title", async () => {
      const short = await postMoment({ text: "  Hello\nworld  " });
      const long = await postMoment({ text: `${"字".repeat(40)}超出` });
      const items = await jsonItems();
      expect(items.find((item) => item.url.endsWith(`/${short}`))?.title).toBe(
        "Hello world",
      );
      expect(items.find((item) => item.url.endsWith(`/${long}`))?.title).toBe(
        `${"字".repeat(40)}…`,
      );
    });

    it("link and identify each Moment by its address, dated by when it was posted and written", async () => {
      const id = await postMoment(
        { text: "dated" },
        { postedAt: POSTED_AT, updatedAt: EDITED_AT },
      );
      const [item] = await jsonItems();
      expect(item?.id).toMatch(new RegExp(`^https://[^/]+/moments/${id}$`));
      expect(item?.url).toBe(item?.id);
      expect(item?.date_published).toBe(POSTED_AT.toISOString());
      expect(item?.date_modified).toBe(EDITED_AT.toISOString());
    });

    it("write the text escaped with its line breaks and links, in all three formats", async () => {
      await postMoment({
        text: "line <one>\nsee https://example.com/a?x=1&y=2.",
      });
      const expected = [
        "line &lt;one&gt;<br>see ",
        'href="https://example.com/a?x=1&amp;y=2"',
        'rel="noopener noreferrer nofollow"',
      ];

      const [item] = await jsonItems();
      for (const part of expected) expect(item?.content_html).toContain(part);

      const ctx = createMockExecutionCtx();
      const rss = parseXml(await buildMomentsRssXml(env, ctx));
      const rssItem = childNamed(childNamed(rss, "channel"), "item");
      for (const part of expected) {
        expect(childNamed(rssItem, "content:encoded").text).toContain(part);
      }
      const atom = parseXml(await buildMomentsAtomXml(env, ctx));
      const [entry] = childrenNamed(atom, "entry");
      if (!entry) throw new Error("Expected an entry");
      for (const part of expected) {
        expect(childNamed(entry, "content").text).toContain(part);
      }
    });

    it("title an images-only Moment 图片动态 with its date and write the images as absolute <img>", async () => {
      await postMoment({ images: ["one.png", "two.png"] });
      const [item] = await jsonItems();
      expect(item?.title).toBe("图片动态 · 2026-03-04");
      expect(item?.content_html).toMatch(
        /^<p><img src="https:\/\/[^"/]+\/images\/one\.png" alt=""><\/p><p><img src="https:\/\/[^"/]+\/images\/two\.png" alt=""><\/p>$/,
      );
    });

    it("title a video-only Moment 视频动态 and write a Direct Video as a video with a link", async () => {
      await postMoment({ video: direct });
      const [item] = await jsonItems();
      expect(item?.title).toBe("视频动态 · 2026-03-04");
      expect(item?.content_html).toBe(
        '<video controls preload="none" src="https://video.example/clip.mp4" poster="https://video.example/poster.jpg"></video><p><a href="https://video.example/clip.mp4">A clip</a></p>',
      );
    });

    it("write the same fallback titles whatever the request locale is", async () => {
      await postMoment({ images: ["one.png"] });
      const build = async () => ({
        json: await buildMomentsFeedJson(env, createMockExecutionCtx()),
        rss: await buildMomentsRssXml(env, createMockExecutionCtx()),
        atom: await buildMomentsAtomXml(env, createMockExecutionCtx()),
      });
      try {
        overwriteGetLocale(() => "zh");
        const zh = await build();
        overwriteGetLocale(() => "en");
        const en = await build();
        expect(en).toEqual(zh);
        expect(en.json).toContain("图片动态");
        expect(en.json).not.toContain("Image moment");
      } finally {
        overwriteGetLocale(() => baseLocale);
      }
    });

    it("write a Bilibili video as a link to its page", async () => {
      await postMoment({ text: "watch", video: bilibili });
      const [item] = await jsonItems();
      expect(item?.content_html).toBe(
        '<p>watch</p><p><a href="https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&amp;t=90">A Bilibili video</a></p>',
      );
    });

    it("list the newest Moments first and stay well-formed XML for hostile text", async () => {
      await postMoment({ text: "old" }, { postedAt: POSTED_AT });
      await postMoment(
        { text: "T\u0000i\u000Btle <T> & ]]> ]]> \uFFFE\nbody ]]> \u001F" },
        { postedAt: EDITED_AT },
      );
      const items = await jsonItems();
      expect(items.map((item) => item.title)).toEqual([
        "T\u0000i tle <T> & ]]> ]]> \uFFFE body ]]> \u001F",
        "old",
      ]);

      const ctx = createMockExecutionCtx();
      for (const document of [
        await buildMomentsRssXml(env, ctx),
        await buildMomentsAtomXml(env, ctx),
      ]) {
        expect(() => parseXml(document)).not.toThrow();
        expect(withoutXmlForbiddenCharacters(document)).toBe(document);
      }
    });
  });
});
