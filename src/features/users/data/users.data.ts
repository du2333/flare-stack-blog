import { and, count, eq, like, or } from "drizzle-orm";
import { user } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 20;

export async function getUsers(
  db: DB,
  options: {
    offset?: number;
    limit?: number;
    search?: string;
    role?: "user" | "admin" | "all";
  } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, search, role } = options;

  const conditions = [];

  // Exclude superadmin from listing — they are not manageable
  conditions.push(
    or(eq(user.role, "admin"), eq(user.role, "user"), eq(user.role, "")),
  );

  if (role && role !== "all") {
    if (role === "user") {
      // "user" role: role is null, empty, or "user"
      conditions.push(
        or(eq(user.role, "user"), eq(user.role, "")),
      );
    } else {
      conditions.push(eq(user.role, role));
    }
  }

  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      or(like(user.name, searchTerm), like(user.email, searchTerm)),
    );
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(whereClause)
      .limit(Math.min(limit, 50))
      .offset(offset)
      .orderBy(user.createdAt),
    db.select({ count: count() }).from(user).where(whereClause),
  ]);

  return {
    items,
    total: totalResult[0].count,
  };
}

export async function updateUserRole(
  db: DB,
  userId: string,
  role: "user" | "admin",
) {
  const [updated] = await db
    .update(user)
    .set({ role })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      name: user.name,
      role: user.role,
    });
  return updated;
}

export async function findUserById(db: DB, userId: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
