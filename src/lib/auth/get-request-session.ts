import { getGlobalStartContext } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";

export async function getRequestSession() {
  const context = getGlobalStartContext();
  if (!context) {
    throw new Error("No global start context found");
  }

  const db = getDb(context.env);
  const auth = getAuth({ db, env: context.env });
  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
}
