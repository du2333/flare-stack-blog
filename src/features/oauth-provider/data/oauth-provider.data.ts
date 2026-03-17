import { eq } from "drizzle-orm";
import { oauthAccessToken } from "@/lib/db/schema/auth.table";

export async function findOAuthAccessTokenByToken(db: DB, token: string) {
  return await db.query.oauthAccessToken.findFirst({
    where: eq(oauthAccessToken.token, token),
    with: {
      oauthClient: true,
      session: true,
    },
  });
}
