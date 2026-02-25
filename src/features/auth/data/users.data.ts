import { desc, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { user } from "@/lib/db/schema";

export type UserRow = typeof user.$inferSelect;

const DEFAULT_PAGE_SIZE = 20;

/**
 * 获取用户列表（offset 分页）
 */
export async function getUserList(
  db: DB,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
  },
): Promise<{ items: Array<UserRow>; total: number }> {
  const { page = 1, limit = DEFAULT_PAGE_SIZE, search } = options ?? {};

  const conditions: Array<SQL> = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(${user.name} LIKE ${pattern} OR ${user.email} LIKE ${pattern})`,
    );
  }

  const whereClause =
    conditions.length > 0
      ? sql`${sql.join(conditions, sql` AND `)}`
      : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(whereClause);

  const total = Number(countResult.count);

  const items = await db
    .select()
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return { items, total };
}

/**
 * 获取用户总数
 */
export async function getUserCount(db: DB): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(user);
  return Number(result.count);
}
