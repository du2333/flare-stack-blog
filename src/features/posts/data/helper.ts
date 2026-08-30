import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import type { PostStatus } from "@/lib/db/schema";
import { PostsTable } from "@/lib/db/schema";

export type SortField = "publishedAt" | "updatedAt";
export type SortDirection = "ASC" | "DESC";

export function escapeLikeString(str: string) {
  return str.replace(/[%_\\]/g, "\\$&");
}

export function buildPostWhereClause(options: {
  status?: PostStatus;
  publicOnly?: boolean;
  search?: string;
}) {
  const whereClauses = [];

  if (options.status) {
    whereClauses.push(eq(PostsTable.status, options.status));
  }

  if (options.publicOnly) {
    whereClauses.push(sql`${PostsTable.publicSnapshotJson} IS NOT NULL`);
  }

  if (options.search) {
    const searchTerm = options.search.trim();
    if (searchTerm) {
      const pattern = `%${escapeLikeString(searchTerm)}%`;
      whereClauses.push(
        or(
          sql`${PostsTable.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${PostsTable.summary} LIKE ${pattern} ESCAPE '\\'`,
          sql`${PostsTable.slug} LIKE ${pattern} ESCAPE '\\'`,
        ),
      );
    }
  }

  return whereClauses.length > 0 ? and(...whereClauses) : undefined;
}

export function buildPostOrderByClause(
  sortDir?: SortDirection,
  sortBy?: SortField,
): SQL {
  const direction = sortDir ?? "DESC";
  const field = sortBy ?? "updatedAt";
  const orderFn = direction === "DESC" ? desc : asc;
  return orderFn(PostsTable[field]);
}
