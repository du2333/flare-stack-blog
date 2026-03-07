import { and, eq, isNotNull } from "drizzle-orm";
import { account, user } from "@/lib/db/schema";

export async function userHasPassword(db: DB, userId: string) {
  const userAccount = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), isNotNull(account.password)),
  });

  return !!userAccount;
}

export async function updateUser(
  db: DB,
  userId: string,
  data: Partial<Omit<typeof user.$inferInsert, "id" | "createdAt">>,
) {
  const [updatedUser] = await db
    .update(user)
    .set(data)
    .where(eq(user.id, userId))
    .returning();
  return updatedUser;
}
