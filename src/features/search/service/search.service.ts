import { insert, search as oramaSearch, remove } from "@orama/orama";
import { isNotNull } from "drizzle-orm";
import { convertToPlainText } from "@/features/posts/utils/content";
import { createMyDb } from "@/features/search/model/schema";
import {
  getOramaDb,
  getOramaMeta,
  persistOramaDb,
} from "@/features/search/model/store";
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
  buildSnippet,
  getMatchedTerms,
} from "@/features/search/utils/search.utils";
import { PostsTable } from "@/lib/db/schema";

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
  try {
    await remove(db, data.id.toString());
  } catch {}
  await persistOramaDb(context.env, db);
  return { id: data.id };
}

export async function rebuildIndex(context: DbContext) {
  const { env, db } = context;
  const start = Date.now();
  console.log("[search] Start backfilling index...");

  const searchDb = await createMyDb();

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

  for (const post of posts) {
    const snapshot = post.publicSnapshotJson;
    if (!snapshot?.title || !snapshot.slug) continue;
    const plain = convertToPlainText(snapshot.contentJson);
    const content =
      plain.length > CONTENT_SLICE ? plain.slice(0, CONTENT_SLICE) : plain;
    const summary =
      snapshot.summary && snapshot.summary.trim().length > 0
        ? snapshot.summary
        : content.slice(0, SNIPPET_SLICE);

    const publishedTagIds = new Set(snapshot.tagIds);
    const tags = post.postTags
      .filter((pt) => publishedTagIds.has(pt.tag.id))
      .map((pt) => pt.tag.name);

    await insert(searchDb, {
      id: post.id.toString(),
      title: snapshot.title,
      slug: snapshot.slug,
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
