import { insert, search as oramaSearch, remove } from "@orama/orama";
import { and, eq, lte } from "drizzle-orm";
import type {
  DeleteSearchDocInput,
  SearchQueryInput,
  UpsertSearchDocInput,
} from "@/features/search/search.schema";
import {
  getOramaDb,
  getOramaMeta,
  persistOramaDb,
} from "@/features/search/model/store";
import { convertToPlainText } from "@/features/posts/utils/content";
import { createMyDb } from "@/features/search/model/schema";
import { PostsTable } from "@/lib/db/schema";
import {
  buildSnippet,
  getMatchedTerms,
} from "@/features/search/utils/search.utils";

export const CONTENT_SLICE = 10000;
export const SNIPPET_SLICE = 200;
export const SNIPPET_CONTEXT = 60;
export const SCAN_LIMIT = CONTENT_SLICE;
export const FUZZY_MAX_DISTANCE = 1;

export async function search(context: DbContext, data: SearchQueryInput) {
  const db = await getOramaDb(context.env);
  const result = await oramaSearch(db, {
    term: data.q,
    limit: Math.min(data.limit, 25),
  });

  return result.hits.map((hit) => {
    const { document, score } = hit;
    const titleHighlight = buildSnippet({
      text: document.title,
      terms: getMatchedTerms(hit, "title"),
      fallbackTerm: data.q,
    });
    const summaryHighlight = buildSnippet({
      text: document.summary,
      terms: getMatchedTerms(hit, "summary"),
      fallbackTerm: data.q,
    });
    const contentHighlight = buildSnippet({
      text: document.content,
      terms: getMatchedTerms(hit, "content"),
      fallbackTerm: data.q,
    });

    return {
      post: {
        id: document.id,
        slug: document.slug,
        title: document.title,
        summary: document.summary,
        tags: document.tags,
      },
      score,
      matches: {
        title: titleHighlight,
        summary: summaryHighlight,
        contentSnippet: contentHighlight,
      },
    };
  });
}

export async function upsert(
  context: { env: Env },
  data: UpsertSearchDocInput,
) {
  const db = await getOramaDb(context.env);

  try {
    await remove(db, data.id.toString());
  } catch {}

  const plain = convertToPlainText(data.contentJson ?? null);
  const content =
    plain.length > CONTENT_SLICE ? plain.slice(0, CONTENT_SLICE) : plain;
  const summary =
    data.summary && data.summary.trim().length > 0
      ? data.summary
      : content.slice(0, SNIPPET_SLICE);

  await insert(db, {
    id: data.id.toString(),
    slug: data.slug,
    title: data.title,
    summary,
    content,
    tags: data.tags ?? [],
  });

  await persistOramaDb(context.env, db);
  return { id: data.id };
}

export async function deleteIndex(
  context: { env: Env },
  data: DeleteSearchDocInput,
) {
  const db = await getOramaDb(context.env);
  await remove(db, data.id.toString());
  await persistOramaDb(context.env, db);
  return { id: data.id };
}

export async function rebuildIndex(context: DbContext) {
  const { env, db } = context;
  const start = Date.now();
  console.log("[search] Start backfilling index...");

  const searchDb = await createMyDb();

  const posts = await db.query.PostsTable.findMany({
    where: and(
      eq(PostsTable.status, "published"),
      lte(PostsTable.publishedAt, new Date()),
    ),
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  for (const post of posts) {
    if (!post.title || !post.slug) continue;
    const plain = convertToPlainText(post.contentJson);
    const content =
      plain.length > CONTENT_SLICE ? plain.slice(0, CONTENT_SLICE) : plain;
    const summary =
      post.summary && post.summary.trim().length > 0
        ? post.summary
        : content.slice(0, SNIPPET_SLICE);

    const tags = post.postTags.map((pt) => pt.tag.name);

    await insert(searchDb, {
      id: post.id.toString(),
      title: post.title,
      slug: post.slug,
      tags,
      summary,
      content,
    });
  }

  await persistOramaDb(env, searchDb);

  const duration = Date.now() - start;
  console.log(`[search] Indexed ${posts.length} posts in ${duration}ms`);

  return { indexed: posts.length, duration };
}

export async function getIndexVersion(context: DbContext) {
  return await getOramaMeta(context.env);
}
