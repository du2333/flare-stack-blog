import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createTestContext } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth/auth.server";
import { user } from "@/lib/db/schema";

describe("first User is Admin", () => {
  it("assigns admin to the first created User only", async () => {
    const context = createTestContext();
    const auth = getAuth({ db: context.db, env });

    await auth.api.signUpEmail({
      body: {
        name: "First",
        email: "first@example.com",
        password: "password1234",
      },
    });

    const [first] = await context.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, "first@example.com"))
      .limit(1);
    expect(first?.role).toBe("admin");

    await auth.api.signUpEmail({
      body: {
        name: "Second",
        email: "second@example.com",
        password: "password1234",
      },
    });

    const [second] = await context.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, "second@example.com"))
      .limit(1);
    expect(second?.role).not.toBe("admin");
  });
});
