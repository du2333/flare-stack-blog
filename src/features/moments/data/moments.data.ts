import { and, count, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { MomentsTable } from "@/lib/db/schema";

const DEFAULT_PUBLIC_LIMIT = 50;
const DEFAULT_ADMIN_LIMIT = 100;

export async function insertMoment(
  db: DB,
  data: typeof MomentsTable.$inferInsert,
) {
  const [moment] = await db.insert(MomentsTable).values(data).returning();
  return moment;
}

export async function findMomentById(db: DB, id: number) {
  return await db.query.MomentsTable.findFirst({
    where: and(eq(MomentsTable.id, id), isNull(MomentsTable.deletedAt)),
  });
}

export async function getPublishedMoments(
  db: DB,
  options: { limit?: number } = {},
) {
  const limit = Math.min(options.limit ?? DEFAULT_PUBLIC_LIMIT, 100);
  const where = and(
    isNull(MomentsTable.deletedAt),
    isNotNull(MomentsTable.publishedAt),
    lte(MomentsTable.publishedAt, new Date()),
  );

  const [items, total] = await Promise.all([
    db
      .select()
      .from(MomentsTable)
      .where(where)
      .orderBy(desc(MomentsTable.publishedAt), desc(MomentsTable.id))
      .limit(limit),
    db.select({ count: count() }).from(MomentsTable).where(where),
  ]);

  return { items, total: total[0]?.count ?? 0 };
}

export async function getAdminMoments(
  db: DB,
  options: { offset?: number; limit?: number } = {},
) {
  const offset = Math.max(options.offset ?? 0, 0);
  const limit = Math.min(options.limit ?? DEFAULT_ADMIN_LIMIT, 100);
  const where = isNull(MomentsTable.deletedAt);

  const [items, total] = await Promise.all([
    db
      .select()
      .from(MomentsTable)
      .where(where)
      .orderBy(desc(MomentsTable.publishedAt), desc(MomentsTable.id))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(MomentsTable).where(where),
  ]);

  return { items, total: total[0]?.count ?? 0 };
}

export async function updateMoment(
  db: DB,
  id: number,
  data: Partial<
    Pick<
      typeof MomentsTable.$inferInsert,
      "type" | "content" | "images" | "location" | "publishedAt"
    >
  >,
) {
  const [moment] = await db
    .update(MomentsTable)
    .set(data)
    .where(and(eq(MomentsTable.id, id), isNull(MomentsTable.deletedAt)))
    .returning();
  return moment;
}

export async function softDeleteMoment(db: DB, id: number) {
  const [moment] = await db
    .update(MomentsTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(MomentsTable.id, id), isNull(MomentsTable.deletedAt)))
    .returning();
  return moment;
}
