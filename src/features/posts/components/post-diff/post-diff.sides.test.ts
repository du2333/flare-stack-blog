import { describe, expect, it } from "vitest";
import { diffMarkdown, fieldChanges, hasBodyChange } from "./post-diff.logic";
import {
  type AdminPostRead,
  draftSide,
  publishedSide,
} from "./post-diff.sides";

const markdown = "## 标题\n\n正文";

const cover = (id: number) => ({
  id,
  key: `cover-${id}.png`,
  url: `/images/cover-${id}.png`,
  fileName: `cover-${id}.png`,
  width: 1200,
  height: 800,
});

/** One read of a published post whose draft equals what is published. */
function read(overrides: Partial<AdminPostRead> = {}): AdminPostRead {
  return {
    id: 1,
    title: "标题",
    summary: "摘要",
    slug: "slug",
    contentJson: undefined,
    contentMarkdown: markdown,
    publicSlug: "slug",
    status: "published",
    publishedAt: "2026-11-01T00:00:00.000Z",
    pinnedAt: null,
    coverMediaId: 7,
    categoryId: 3,
    saveToken: "token",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
    tags: [
      { id: 2, name: "b", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: 1, name: "a", createdAt: "2026-10-01T00:00:00.000Z" },
    ],
    hasPublicSnapshot: true,
    hasUnpublishedChanges: false,
    publicSnapshotContentMarkdown: markdown,
    published: {
      title: "标题",
      summary: "摘要",
      slug: "slug",
      publishedAt: "2026-11-01T00:00:00.000Z",
      cover: cover(7),
      categoryId: 3,
      tagIds: [1, 2],
    },
    serverToday: "2026-11-15",
    cover: cover(7),
    ...overrides,
  } as AdminPostRead;
}

const lookups = { categories: [], tags: [] };

/** The fields the diff reports between the published version and the draft. */
function compare(post: AdminPostRead) {
  const before = publishedSide(post)!;
  const after = draftSide(post, post.tags ?? []);
  return {
    fields: fieldChanges(before, after, lookups).map((change) => change.field),
    body: hasBodyChange(diffMarkdown(before.markdown, after.markdown)),
  };
}

describe("publishedSide and draftSide", () => {
  it("map every field of the published version and of the draft", () => {
    const post = read({
      title: "草稿标题",
      summary: null,
      slug: "draft-slug",
      publishedAt: new Date("2026-11-10T00:00:00.000Z"),
      coverMediaId: 8,
      cover: cover(8),
      categoryId: 4,
      tags: [
        { id: 9, name: "c", createdAt: new Date("2026-10-01T00:00:00.000Z") },
      ],
      contentMarkdown: "草稿正文",
    });

    expect(publishedSide(post)).toEqual({
      title: "标题",
      summary: "摘要",
      slug: "slug",
      publishedAt: "2026-11-01T00:00:00.000Z",
      categoryId: 3,
      tagIds: [1, 2],
      coverMediaId: 7,
      coverUrl: "/images/cover-7.png",
      markdown: markdown,
    });
    expect(draftSide(post, post.tags ?? [])).toEqual({
      title: "草稿标题",
      summary: null,
      slug: "draft-slug",
      publishedAt: new Date("2026-11-10T00:00:00.000Z"),
      categoryId: 4,
      tagIds: [9],
      coverMediaId: 8,
      coverUrl: "/images/cover-8.png",
      markdown: "草稿正文",
    });
  });

  it("have no published side for a post that is not published", () => {
    expect(publishedSide(read({ published: null }))).toBeNull();
  });

  it("map a missing cover and an empty body to null", () => {
    const post = read({
      cover: null,
      coverMediaId: null,
      contentMarkdown: null,
      published: { ...read().published!, cover: null },
      publicSnapshotContentMarkdown: null,
    });
    expect(publishedSide(post)).toMatchObject({
      coverMediaId: null,
      coverUrl: null,
      markdown: null,
    });
    expect(draftSide(post, [])).toMatchObject({
      coverMediaId: null,
      coverUrl: null,
      markdown: null,
    });
  });

  it("report no change when the draft equals what is published", () => {
    expect(compare(read())).toEqual({ fields: [], body: false });
  });

  it("report only the category when only the category differs", () => {
    expect(compare(read({ categoryId: 4 }))).toEqual({
      fields: ["category"],
      body: false,
    });
  });

  it("report only the cover when only the cover differs", () => {
    expect(compare(read({ coverMediaId: 8, cover: cover(8) }))).toEqual({
      fields: ["cover"],
      body: false,
    });
  });

  it("report only the body when only the body differs", () => {
    expect(compare(read({ contentMarkdown: `${markdown}\n\n新增` }))).toEqual({
      fields: [],
      body: true,
    });
  });
});
