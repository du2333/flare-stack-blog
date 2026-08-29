import { desc, eq, isNotNull } from "drizzle-orm";
import { user } from "@/lib/db/schema";

export async function findUserById(db: DB, userId: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
  });
}

export async function listMutedUsers(db: DB) {
  return await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      mutedAt: user.mutedAt,
    })
    .from(user)
    .where(isNotNull(user.mutedAt))
    .orderBy(desc(user.mutedAt));
}

export async function setMutedAt(db: DB, userId: string, mutedAt: Date | null) {
  const [updated] = await db
    .update(user)
    .set({ mutedAt })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      name: user.name,
      image: user.image,
      mutedAt: user.mutedAt,
    });
  return updated ?? null;
}
