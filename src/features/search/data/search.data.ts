import { eq } from "drizzle-orm";
import {
  SearchDocumentsTable,
  SearchIndexMetaTable,
} from "@/lib/db/schema/search.table";

export type SearchDocumentRow = {
  postId: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
};

export async function upsertSearchDocument(
  db: DB,
  document: SearchDocumentRow & { tokens: string },
) {
  await db
    .insert(SearchDocumentsTable)
    .values({
      postId: document.postId,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      content: document.content,
      tags: document.tags,
      tokens: document.tokens,
    })
    .onConflictDoUpdate({
      target: SearchDocumentsTable.postId,
      set: {
        slug: document.slug,
        title: document.title,
        summary: document.summary,
        content: document.content,
        tags: document.tags,
        tokens: document.tokens,
      },
    });
  await bumpSearchIndexVersion(db);
}

export async function deleteSearchDocument(db: DB, postId: number) {
  await db
    .delete(SearchDocumentsTable)
    .where(eq(SearchDocumentsTable.postId, postId));
  await bumpSearchIndexVersion(db);
}

const INSERT_BATCH = 10;

export async function replaceSearchDocuments(
  db: DB,
  documents: Array<SearchDocumentRow & { tokens: string }>,
) {
  await db.delete(SearchDocumentsTable);
  for (let i = 0; i < documents.length; i += INSERT_BATCH) {
    await db
      .insert(SearchDocumentsTable)
      .values(documents.slice(i, i + INSERT_BATCH));
  }
  await bumpSearchIndexVersion(db);
}

export async function matchSearchDocuments(
  env: Env,
  match: string,
  limit: number,
): Promise<SearchDocumentRow[]> {
  const result = await env.DB.prepare(
    `SELECT d.post_id AS postId, d.slug, d.title, d.summary, d.content, d.tags
     FROM search_documents_fts
     JOIN search_documents d ON d.post_id = search_documents_fts.rowid
     WHERE search_documents_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
  )
    .bind(match, limit)
    .all<{
      postId: number;
      slug: string;
      title: string;
      summary: string;
      content: string;
      tags: string;
    }>();

  return (result.results ?? []).map((row) => ({
    postId: row.postId,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    tags: parseTags(row.tags),
  }));
}

export async function readSearchIndexVersion(db: DB) {
  const [row] = await db
    .select({ version: SearchIndexMetaTable.version })
    .from(SearchIndexMetaTable)
    .where(eq(SearchIndexMetaTable.id, 1))
    .limit(1);
  return row?.version ?? "0";
}

async function bumpSearchIndexVersion(db: DB) {
  const version = Date.now().toString();
  await db
    .insert(SearchIndexMetaTable)
    .values({ id: 1, version })
    .onConflictDoUpdate({
      target: SearchIndexMetaTable.id,
      set: { version },
    });
}

function parseTags(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed;
    }
  } catch {}
  return [];
}
