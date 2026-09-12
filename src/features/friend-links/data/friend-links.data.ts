import { and, count, desc, eq, sql } from "drizzle-orm";
import type { FriendLinkStatus } from "@/lib/db/schema";
import { FriendLinksTable, user } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 20;
function searchCondition(search?: string) {
  const value = search?.trim().toLowerCase();
  if (!value) return undefined;
  return sql`(instr(lower(${FriendLinksTable.siteName}), ${value}) > 0 or instr(lower(${FriendLinksTable.siteUrl}), ${value}) > 0)`;
}

export async function insertFriendLink(
  db: DB,
  data: typeof FriendLinksTable.$inferInsert,
) {
  const [friendLink] = await db
    .insert(FriendLinksTable)
    .values(data)
    .returning();
  return friendLink;
}

export async function findFriendLinkById(db: DB, id: number) {
  return await db.query.FriendLinksTable.findFirst({
    where: eq(FriendLinksTable.id, id),
  });
}

export async function getAllFriendLinks(
  db: DB,
  options: {
    offset?: number;
    limit?: number | null;
    status?: FriendLinkStatus;
    search?: string;
  } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, status } = options;
  const conditions = [];
  if (status) conditions.push(eq(FriendLinksTable.status, status));
  const search = searchCondition(options.search);
  if (search) conditions.push(search);

  const query = db
    .select({
      id: FriendLinksTable.id,
      siteName: FriendLinksTable.siteName,
      siteUrl: FriendLinksTable.siteUrl,
      description: FriendLinksTable.description,
      logoUrl: FriendLinksTable.logoUrl,
      status: FriendLinksTable.status,
      rejectionReason: FriendLinksTable.rejectionReason,
      userId: FriendLinksTable.userId,
      createdAt: FriendLinksTable.createdAt,
      updatedAt: FriendLinksTable.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(FriendLinksTable)
    .leftJoin(user, eq(FriendLinksTable.userId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(FriendLinksTable.createdAt), desc(FriendLinksTable.id));

  const items =
    limit == null
      ? await query.offset(offset)
      : await query.limit(Math.min(limit, 100)).offset(offset);

  return items;
}

export async function getAllFriendLinksCount(
  db: DB,
  options: { status?: FriendLinkStatus; search?: string } = {},
) {
  const conditions = [];
  if (options.status)
    conditions.push(eq(FriendLinksTable.status, options.status));

  const search = searchCondition(options.search);
  if (search) conditions.push(search);
  const result = await db
    .select({ count: count() })
    .from(FriendLinksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result[0].count;
}

export async function getFriendLinkStatusCounts(db: DB) {
  const rows = await db
    .select({
      status: FriendLinksTable.status,
      count: count(),
    })
    .from(FriendLinksTable)
    .groupBy(FriendLinksTable.status);

  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const row of rows) {
    counts[row.status] = row.count;
  }

  return counts;
}

export async function getFriendLinksByUserId(db: DB, userId: string) {
  return await db
    .select()
    .from(FriendLinksTable)
    .where(eq(FriendLinksTable.userId, userId))
    .orderBy(desc(FriendLinksTable.createdAt), desc(FriendLinksTable.id));
}

export async function updateFriendLink(
  db: DB,
  id: number,
  data: Partial<Omit<typeof FriendLinksTable.$inferInsert, "id" | "createdAt">>,
) {
  const [friendLink] = await db
    .update(FriendLinksTable)
    .set(data)
    .where(eq(FriendLinksTable.id, id))
    .returning();
  return friendLink;
}

export async function deleteFriendLink(db: DB, id: number) {
  await db.delete(FriendLinksTable).where(eq(FriendLinksTable.id, id));
}

/** Recipient stays server-only; public friend-link user summaries never contain email. */
export async function getApplicantEmail(db: DB, userId: string | null) {
  if (!userId) return null;
  const [applicant] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  return applicant?.email ?? null;
}

export async function resubmitFriendLink(
  db: DB,
  id: number,
  userId: string,
  data: Pick<
    typeof FriendLinksTable.$inferInsert,
    "siteName" | "siteUrl" | "description" | "logoUrl"
  >,
) {
  const [result] = await db
    .update(FriendLinksTable)
    .set({ ...data, status: "pending", rejectionReason: null })
    .where(
      and(
        eq(FriendLinksTable.id, id),
        eq(FriendLinksTable.userId, userId),
        eq(FriendLinksTable.status, "rejected"),
      ),
    )
    .returning();
  return result;
}
