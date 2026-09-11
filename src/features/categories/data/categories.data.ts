import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { CategoriesTable, PostsTable } from "@/lib/db/schema";

const snapshotCategoryId = sql<
  number | null
>`json_extract(${PostsTable.publicSnapshotJson}, '$.categoryId')`;

export async function insertCategory(
  db: DB,
  data: typeof CategoriesTable.$inferInsert,
) {
  const [category] = await db.insert(CategoriesTable).values(data).returning();
  return category;
}

export async function findCategoryById(db: DB, id: number) {
  return await db.query.CategoriesTable.findFirst({
    where: eq(CategoriesTable.id, id),
  });
}

export async function nameExists(
  db: DB,
  name: string,
  options: { excludeId?: number } = {},
) {
  const conditions = [eq(CategoriesTable.name, name)];
  if (options.excludeId != null) {
    conditions.push(ne(CategoriesTable.id, options.excludeId));
  }
  const row = await db.query.CategoriesTable.findFirst({
    where: and(...conditions),
  });
  return !!row;
}

export async function getAllCategories(
  db: DB,
  options: {
    sortBy?: "name" | "createdAt";
    sortDir?: "asc" | "desc";
  } = {},
) {
  const { sortBy = "name", sortDir = "asc" } = options;
  const orderFn = sortDir === "asc" ? asc : desc;
  const orderColumn =
    sortBy === "createdAt" ? CategoriesTable.createdAt : CategoriesTable.name;
  return await db.select().from(CategoriesTable).orderBy(orderFn(orderColumn));
}

export async function getAllCategoriesWithCount(
  db: DB,
  options: {
    sortBy?: "name" | "createdAt" | "postCount";
    sortDir?: "asc" | "desc";
    publicOnly?: boolean;
  } = {},
) {
  const { sortBy = "name", sortDir = "asc", publicOnly = false } = options;
  const orderFn = sortDir === "asc" ? asc : desc;

  if (publicOnly) {
    const query = db
      .select({
        id: CategoriesTable.id,
        name: CategoriesTable.name,
        createdAt: CategoriesTable.createdAt,
        postCount: count(PostsTable.id).as("postCount"),
      })
      .from(CategoriesTable)
      .innerJoin(
        PostsTable,
        and(
          isNotNull(PostsTable.publicSnapshotJson),
          eq(snapshotCategoryId, CategoriesTable.id),
        ),
      )
      .groupBy(CategoriesTable.id)
      .$dynamic();

    if (sortBy === "postCount") {
      query.orderBy(orderFn(sql`postCount`));
    } else if (sortBy === "createdAt") {
      query.orderBy(orderFn(CategoriesTable.createdAt));
    } else {
      query.orderBy(orderFn(CategoriesTable.name));
    }

    return await query;
  }

  const query = db
    .select({
      id: CategoriesTable.id,
      name: CategoriesTable.name,
      createdAt: CategoriesTable.createdAt,
      postCount: count(PostsTable.id).as("postCount"),
    })
    .from(CategoriesTable)
    .leftJoin(PostsTable, eq(PostsTable.categoryId, CategoriesTable.id))
    .groupBy(CategoriesTable.id)
    .$dynamic();

  if (sortBy === "postCount") {
    query.orderBy(orderFn(sql`postCount`));
  } else if (sortBy === "createdAt") {
    query.orderBy(orderFn(CategoriesTable.createdAt));
  } else {
    query.orderBy(orderFn(CategoriesTable.name));
  }

  return await query;
}

export async function countUncategorizedPosts(db: DB, publicOnly = false) {
  const [row] = await db
    .select({ postCount: count() })
    .from(PostsTable)
    .where(
      publicOnly
        ? sql`${PostsTable.publicSnapshotJson} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${CategoriesTable} WHERE ${CategoriesTable.id} = ${snapshotCategoryId})`
        : isNull(PostsTable.categoryId),
    );
  return Number(row?.postCount ?? 0);
}

export async function updateCategory(
  db: DB,
  id: number,
  data: { name?: string },
) {
  const [category] = await db
    .update(CategoriesTable)
    .set(data)
    .where(eq(CategoriesTable.id, id))
    .returning();
  return category;
}

export async function deleteCategory(db: DB, id: number) {
  await db.delete(CategoriesTable).where(eq(CategoriesTable.id, id));
}

export async function getPublishedPostsByCategoryId(
  db: DB,
  categoryId: number,
) {
  return await db
    .select({
      id: PostsTable.id,
      slug: PostsTable.publicSlug,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        eq(snapshotCategoryId, categoryId),
      ),
    );
}
