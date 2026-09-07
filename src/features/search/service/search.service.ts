import { inArray, isNotNull } from "drizzle-orm";
import { convertToPlainText } from "@/features/posts/utils/content";
import * as SearchRepo from "@/features/search/data/search.data";
import {
  CONTENT_SLICE,
  SNIPPET_SLICE,
} from "@/features/search/search.constants";
import type {
  DeleteSearchDocInput,
  SearchQueryInput,
  UpsertSearchDocInput,
} from "@/features/search/search.schema";
import {
  queryTerms,
  toFtsMatchQuery,
  tokenizeForSearch,
} from "@/features/search/tokenize";
import { buildSnippet } from "@/features/search/utils/search.utils";
import { CategoriesTable, PostsTable } from "@/lib/db/schema";

function toIndexedDocument(
  data: UpsertSearchDocInput,
): Parameters<typeof SearchRepo.upsertSearchDocument>[1] {
  const plain = convertToPlainText(data.contentJson ?? null);
  const indexed = [data.category?.trim(), plain].filter(Boolean).join("\n");
  const content =
    indexed.length > CONTENT_SLICE ? indexed.slice(0, CONTENT_SLICE) : indexed;
  const summary =
    data.summary && data.summary.trim().length > 0
      ? data.summary
      : content.slice(0, SNIPPET_SLICE);

  return {
    postId: data.id,
    slug: data.slug,
    title: data.title,
    summary,
    content,
    tags: data.tags ?? [],
    tokens: tokenizeForSearch(
      data.title,
      summary,
      content,
      data.category,
      ...(data.tags ?? []),
    ),
  };
}

export async function search(context: DbContext, data: SearchQueryInput) {
  const match = toFtsMatchQuery(data.q);
  if (!match) return [];

  const rows = await SearchRepo.matchSearchDocuments(
    context.env,
    match,
    Math.min(data.limit, 25),
  );
  const terms = queryTerms(data.q);

  return rows.map((row) => ({
    post: {
      id: row.postId,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      tags: row.tags,
    },
    score: 0,
    matches: {
      title: buildSnippet({
        text: row.title,
        terms,
        fallbackTerm: data.q,
      }),
      summary: buildSnippet({
        text: row.summary,
        terms,
        fallbackTerm: data.q,
      }),
      contentSnippet: buildSnippet({
        text: row.content,
        terms,
        fallbackTerm: data.q,
      }),
    },
  }));
}

export async function upsert(
  context: { env: Env; db: DB },
  data: UpsertSearchDocInput,
) {
  await SearchRepo.upsertSearchDocument(context.db, toIndexedDocument(data));
  return { id: data.id };
}

export async function deleteIndex(
  context: { env: Env; db: DB },
  data: DeleteSearchDocInput,
) {
  await SearchRepo.deleteSearchDocument(context.db, data.id);
  return { id: data.id };
}

export async function rebuildIndex(context: DbContext) {
  const { db } = context;
  const start = Date.now();

  const posts = await db.query.PostsTable.findMany({
    where: isNotNull(PostsTable.publicSnapshotJson),
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const categoryIds = [
    ...new Set(
      posts.flatMap((post) => {
        const categoryId = post.publicSnapshotJson?.categoryId;
        return categoryId == null ? [] : [categoryId];
      }),
    ),
  ];
  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(CategoriesTable)
          .where(inArray(CategoriesTable.id, categoryIds))
      : [];
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  const documents = [];
  for (const post of posts) {
    const snapshot = post.publicSnapshotJson;
    if (!snapshot?.title || !snapshot.slug) continue;
    const publishedTagIds = new Set(snapshot.tagIds);
    const tags = post.postTags
      .filter((pt) => publishedTagIds.has(pt.tag.id))
      .map((pt) => pt.tag.name);
    const categoryName =
      snapshot.categoryId == null
        ? null
        : (categoriesById.get(snapshot.categoryId)?.name ?? null);

    documents.push(
      toIndexedDocument({
        id: post.id,
        slug: snapshot.slug,
        title: snapshot.title,
        summary: snapshot.summary,
        contentJson: snapshot.contentJson,
        tags,
        category: categoryName,
      }),
    );
  }

  await SearchRepo.replaceSearchDocuments(db, documents);

  const duration = Date.now() - start;
  console.log(`[search] Indexed ${documents.length} posts in ${duration}ms`);

  return { indexed: documents.length, duration };
}

export async function getIndexVersion(context: DbContext) {
  return { version: await SearchRepo.readSearchIndexVersion(context.db) };
}
